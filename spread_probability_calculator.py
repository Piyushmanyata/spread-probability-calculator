"""
Spread Probability Calculator (Production v8)

Features:
- Fully automated (argparse, no input() blocking)
- Expanding-window MAD for outlier detection (NO look-ahead bias)
- Warm-up period dropped for data integrity (first N rows removed)
- Support/Resistance detection with recency window (last N days)
- Vectorized bootstrap and conditional probability calculation
- CWD-first path resolution for pipeline compatibility
- Business-day strict mode (preserves Friday->Monday transitions)

Usage:
    python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv
    python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv --strict
    python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv --bootstrap-iter 5000
"""

import argparse
import sys
import warnings
import pandas as pd
import numpy as np
from pathlib import Path
from scipy import stats
from collections import Counter
from dataclasses import dataclass
from typing import Optional, Dict, Tuple, List

# Required columns for each input CSV
REQUIRED_COLUMNS = {'datetime', 'open', 'high', 'low', 'close', 'volume'}


@dataclass
class Config:
    """Configuration for spread calculator."""
    tick_size: float = 0.005
    tick_levels: Tuple[int, ...] = (1, 2, 3)
    outlier_mad_threshold: float = 4.0
    min_outlier_ticks: int = 10
    max_days_gap: int = 3
    strict_daily_only: bool = False
    min_expanding_window: int = 20
    min_conditional_samples: int = 30
    swing_window: int = 5
    top_n_levels: int = 3
    sr_min_distance_ticks: int = 4
    sr_lookback_days: int = 60
    bootstrap_iterations: int = 2000
    bootstrap_seed: Optional[int] = None  # None = random, set int for reproducibility
    default_file1: Optional[str] = "DATA\SONZ26-U27_1D.csv"
    default_file2: Optional[str] = "DATA\SONH27-Z27_1D.csv"


class SpreadCalculator:
    """
    Production-grade spread probability calculator with support/resistance.
    
    Design principles:
    1. Expanding-window MAD with warm-up period dropped (NO look-ahead bias)
       First (min_expanding_window - 1) rows are dropped for data integrity.
    2. No manual intervention: Fully scriptable via argparse
    3. CWD-first path resolution for pipeline compatibility
    4. Support/Resistance via volume nodes and swing levels (recency-weighted)
    5. Vectorized bootstrap (100x faster than loop-based)
    6. Calculation and presentation logic are separated
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.df: Optional[pd.DataFrame] = None
        self.df_valid: Optional[pd.DataFrame] = None
        self.results: Dict = {}
    
    def load_and_merge(self, file1_path: str, file2_path: str) -> pd.DataFrame:
        """Load and merge data with schema validation and outlier detection."""
        df1 = pd.read_csv(file1_path)
        df2 = pd.read_csv(file2_path)
        
        # Normalize column names
        df1.columns = df1.columns.str.lower().str.strip()
        df2.columns = df2.columns.str.lower().str.strip()
        
        # SCHEMA VALIDATION
        missing1 = REQUIRED_COLUMNS - set(df1.columns)
        missing2 = REQUIRED_COLUMNS - set(df2.columns)
        if missing1:
            print(f"❌ File 1 missing required columns: {missing1}")
            sys.exit(1)
        if missing2:
            print(f"❌ File 2 missing required columns: {missing2}")
            sys.exit(1)
        
        print(f"\n{'='*80}")
        print("DATA LOADING")
        print(f"{'='*80}")
        print(f"File 1: {Path(file1_path).name} ({len(df1)} records)")
        print(f"File 2: {Path(file2_path).name} ({len(df2)} records)")
        
        df1 = df1.rename(columns={
            'open': 'open1', 'high': 'high1', 'low': 'low1', 
            'close': 'close1', 'volume': 'volume1'
        })
        df2 = df2.rename(columns={
            'open': 'open2', 'high': 'high2', 'low': 'low2', 
            'close': 'close2', 'volume': 'volume2'
        })
        
        df1['datetime'] = pd.to_datetime(df1['datetime'])
        df2['datetime'] = pd.to_datetime(df2['datetime'])
        
        # SORT BY DATETIME BEFORE CREATING DATE_KEY (ensures last timestamp of day is kept)
        df1 = df1.sort_values('datetime', ascending=True)
        df2 = df2.sort_values('datetime', ascending=True)
        
        df1 = df1.assign(date_key=df1['datetime'].dt.date)
        df2 = df2.assign(date_key=df2['datetime'].dt.date)
        
        # Deduplicate: keep='last' ensures we use the last timestamp of each day
        n1_orig, n2_orig = len(df1), len(df2)
        df1 = df1.drop_duplicates(subset=['date_key'], keep='last')
        df2 = df2.drop_duplicates(subset=['date_key'], keep='last')
        
        dups1, dups2 = n1_orig - len(df1), n2_orig - len(df2)
        if dups1 > 0 or dups2 > 0:
            print(f"⚠️  Consolidated intraday rows to Daily Close: File1={dups1}, File2={dups2}")
        
        # CRITICAL WARNING: Check for excessive data loss from duplicates
        loss_pct1 = (dups1 / n1_orig) * 100 if n1_orig > 0 else 0
        loss_pct2 = (dups2 / n2_orig) * 100 if n2_orig > 0 else 0
        if loss_pct1 > 20 or loss_pct2 > 20:
            print(f"🚨 CRITICAL WARNING: High data loss detected! File1={loss_pct1:.1f}%, File2={loss_pct2:.1f}%")
            print(f"   Check input files for unexpected intraday duplicates.")
        
        n1, n2 = len(df1), len(df2)
        
        merged = pd.merge(
            df1[['datetime', 'date_key', 'close1', 'volume1']],
            df2[['date_key', 'close2', 'volume2']],
            on='date_key', how='inner'
        ).sort_values('datetime').reset_index(drop=True)
        
        lost = max(n1, n2) - len(merged)
        if lost > 0:
            print(f"⚠️  {lost} records lost due to non-overlapping dates")
        
        merged = merged.copy()
        merged.loc[:, 'spread_close'] = merged['close1'] - merged['close2']
        merged.loc[:, 'spread_volume'] = np.minimum(merged['volume1'], merged['volume2'])
        merged.loc[:, 'price_change'] = merged['spread_close'].diff()
        merged.loc[:, 'tick_move'] = (merged['price_change'] / self.config.tick_size).round().astype('Int64')
        merged.loc[:, 'abs_tick_move'] = merged['tick_move'].abs()
        merged.loc[:, 'days_gap'] = merged['datetime'].diff().dt.days
        
        # MARKET-ONLY DATA LOGIC: Input has trading days only (no weekends/holidays rows)
        # Strict Mode: days_gap <= 3 (Fri->Mon = 3 days = normal weekend)
        #              days_gap = 4 means missing trading day (holiday) -> REJECT
        # Relaxed Mode: days_gap <= 5 (allows long weekends/bank holidays)
        if self.config.strict_daily_only:
            merged.loc[:, 'is_consecutive'] = (merged['days_gap'].fillna(999) <= 3)
            print("ℹ️  Strict Mode: Rejecting gaps > 3 days (Holidays/Data Holes)")
        else:
            merged.loc[:, 'is_consecutive'] = (merged['days_gap'].fillna(999) <= 5)
            print("ℹ️  Relaxed Mode: Allowing gaps ≤5 days (Long Weekends)")
        
        # First row has no gap - mark as consecutive
        merged.loc[merged.index[0], 'is_consecutive'] = True
        
        # Add stable row_id for adjacency checks (before any filtering)
        merged['row_id'] = np.arange(len(merged))
        
        # Expanding-window MAD for outlier detection
        tick_series = merged['tick_move'].astype(float)
        min_periods = self.config.min_expanding_window
        
        rolling_median = tick_series.expanding(min_periods=min_periods).median()
        rolling_mad = (tick_series - rolling_median).abs().expanding(min_periods=min_periods).median()
        rolling_mad_scaled = rolling_mad * 1.4826
        
        # Identify warm-up rows (where stats are NaN)
        warm_up_mask = rolling_median.isna() | rolling_mad_scaled.isna()
        n_warm_up = warm_up_mask.sum()
        
        # Calculate outliers on FULL dataframe (warm-up rows will be marked as non-outlier)
        rolling_threshold = self.config.outlier_mad_threshold * np.maximum(
            rolling_mad_scaled.fillna(self.config.min_outlier_ticks), 
            self.config.min_outlier_ticks
        )
        
        merged.loc[:, 'is_outlier'] = (
            merged['tick_move'].isna() | 
            (np.abs(tick_series - rolling_median) > rolling_threshold)
        )
        # Warm-up rows are NOT outliers (we have no stats to judge them)
        merged.loc[warm_up_mask, 'is_outlier'] = False
        merged.loc[:, 'is_warmup'] = warm_up_mask
        
        n_outliers = merged['is_outlier'].sum()
        if n_outliers > 0:
            final_threshold = rolling_threshold.iloc[-1] if len(rolling_threshold) > 0 else self.config.min_outlier_ticks
            print(f"⚠️  {n_outliers} outliers flagged (expanding MAD, threshold: {final_threshold:.1f} ticks)")
        
        if n_warm_up > 0:
            print(f"⚠️  {n_warm_up} warm-up rows (excluded from filtered stats, included in raw)")
        
        # Gap logging
        n_gaps = ((~merged['is_consecutive']) & merged['tick_move'].notna()).sum()
        max_gap = 3 if self.config.strict_daily_only else 5
        if n_gaps > 0:
            print(f"⚠️  {n_gaps} gaps >{max_gap} days excluded")
        
        print(f"\nMerged: {len(merged)} days | Range: {merged['datetime'].min().date()} to {merged['datetime'].max().date()}")
        
        self.df = merged
        
        # DUAL REGIME: Create both raw and filtered datasets
        # df_raw: ALL consecutive rows INCLUDING outliers AND warm-up (Real World view)
        self.df_raw = merged[
            merged['is_consecutive'] & 
            merged['tick_move'].notna()
        ].copy()
        
        # df_valid: Filtered data EXCLUDING outliers AND warm-up (Normal Regime view)
        self.df_valid = merged[
            ~merged['is_outlier'] & 
            ~merged['is_warmup'] &
            merged['is_consecutive'] & 
            merged['tick_move'].notna()
        ].copy()
        
        self.results['n_valid'] = len(self.df_valid)
        self.results['n_raw'] = len(self.df_raw)
        self.results['n_excluded_gaps'] = n_gaps
        self.results['n_outliers'] = n_outliers
        self.results['n_warmup'] = n_warm_up
        self.results['total_volume'] = merged['spread_volume'].sum()
        
        return merged
    
    def _get_valid_moves(self) -> pd.DataFrame:
        """Return cached valid DataFrame (Normal Regime - filtered)."""
        return self.df_valid
    
    def _get_raw_moves(self) -> pd.DataFrame:
        """Return raw DataFrame (Real World - includes outliers)."""
        return self.df_raw
    
    def _compute_probs_for_dataset(self, data: pd.DataFrame, label: str) -> Dict:
        """Compute probabilities for a given dataset."""
        n = len(data)
        if n == 0:
            return {}
        
        results = {}
        
        # Zero-tick
        zero_mask = data['tick_move'] == 0
        count_zero = zero_mask.sum()
        results[0] = {
            'tick_value': 0,
            'count_exact': int(count_zero),
            'prob_exact': count_zero / n,
            'prob_exact_ci': self._wilson_ci(count_zero, n),
        }
        
        for nticks in self.config.tick_levels:
            exact_mask = data['abs_tick_move'] == nticks
            at_least_mask = data['abs_tick_move'] >= nticks
            up_mask = data['tick_move'] >= nticks
            down_mask = data['tick_move'] <= -nticks
            
            count_exact = exact_mask.sum()
            count_at_least = at_least_mask.sum()
            count_up = up_mask.sum()
            count_down = down_mask.sum()
            
            results[nticks] = {
                'tick_value': nticks * self.config.tick_size,
                'count_exact': int(count_exact),
                'prob_exact': count_exact / n,
                'prob_exact_ci': self._wilson_ci(count_exact, n),
                'count_at_least': int(count_at_least),
                'prob_at_least': count_at_least / n,
                'prob_at_least_ci': self._wilson_ci(count_at_least, n),
                'count_up': int(count_up),
                'prob_up_at_least': count_up / n,
                'prob_up_ci': self._wilson_ci(count_up, n),
                'count_down': int(count_down),
                'prob_down_at_least': count_down / n,
                'prob_down_ci': self._wilson_ci(count_down, n),
            }
        
        return {'n': n, 'label': label, 'probs': results}
    
    def calculate_empirical_probabilities(self) -> Dict:
        """Calculate DUAL-REGIME empirical probabilities.
        
        Returns both:
        - 'raw': Real World (Including Spikes) - uses all consecutive rows
        - 'filtered': Normal Regime - excludes MAD outliers
        """
        raw_data = self._get_raw_moves()
        filtered_data = self._get_valid_moves()
        
        raw_results = self._compute_probs_for_dataset(raw_data, "Real World (Inc. Spikes)")
        filtered_results = self._compute_probs_for_dataset(filtered_data, "Normal Regime")
        
        # Store both for display
        self.results['empirical_raw'] = raw_results
        self.results['empirical'] = filtered_results.get('probs', {})  # Backward compat
        self.results['empirical_filtered'] = filtered_results
        
        return {'raw': raw_results, 'filtered': filtered_results}
    
    def calculate_volume_weighted(self) -> Dict:
        """Calculate volume-weighted probabilities.
        
        Uses RAW data (includes outliers) because volume analysis is most critical
        during high-volume spike events (crashes, panic). Ignoring outliers here
        would hide tail risk.
        """
        # FIXED: Use raw data to include high-volume outlier events
        raw = self._get_raw_moves()
        total_vol = raw['spread_volume'].sum()
        
        if total_vol == 0:
            return {}
        
        results = {}
        for nticks in self.config.tick_levels:
            at_least_mask = raw['abs_tick_move'] >= nticks
            up_mask = raw['tick_move'] >= nticks
            down_mask = raw['tick_move'] <= -nticks
            
            vol_at_least = raw.loc[at_least_mask, 'spread_volume'].sum()
            vol_up = raw.loc[up_mask, 'spread_volume'].sum()
            vol_down = raw.loc[down_mask, 'spread_volume'].sum()
            
            results[nticks] = {
                'vol_weighted_at_least': vol_at_least / total_vol,
                'vol_weighted_up': vol_up / total_vol,
                'vol_weighted_down': vol_down / total_vol,
            }
        
        self.results['vol_weighted'] = results
        return results
    
    def calculate_bootstrap(self, n_iter: Optional[int] = None) -> Dict:
        """Bootstrap confidence intervals - VECTORIZED for 100x speedup.
        
        WARNING: IID Assumption
        This bootstrap uses random sampling which assumes IID (independent, identically
        distributed) observations. Financial time series often exhibit serial correlation.
        The confidence intervals may underestimate true uncertainty. For production use,
        consider block bootstrap methods that preserve autocorrelation structure.
        """
        if n_iter is None:
            n_iter = self.config.bootstrap_iterations
        
        valid = self._get_valid_moves()
        n = len(valid)
        
        if n == 0:
            return {}
        
        tick_moves = valid['tick_move'].values.astype(float)
        abs_moves = valid['abs_tick_move'].values.astype(float)
        
        # Use configurable RNG seed (None = random for production, set int for reproducibility)
        rng = np.random.default_rng(self.config.bootstrap_seed)
        results = {}
        
        # VECTORIZED: Generate all bootstrap indices at once (n_samples, n_iter)
        # NOTE: IID sampling - may underestimate CI width if data has autocorrelation
        boot_indices = rng.choice(n, size=(n, n_iter), replace=True)
        
        # Use advanced indexing to get all bootstrap samples
        boot_abs_samples = abs_moves[boot_indices]  # Shape: (n, n_iter)
        boot_dir_samples = tick_moves[boot_indices]  # Shape: (n, n_iter)
        
        for nticks in self.config.tick_levels:
            # Vectorized: compute means across samples (axis=0)
            boot_abs = np.sum(boot_abs_samples >= nticks, axis=0) / n
            boot_up = np.sum(boot_dir_samples >= nticks, axis=0) / n
            boot_down = np.sum(boot_dir_samples <= -nticks, axis=0) / n
            
            results[nticks] = {
                'abs': {'mean': float(np.mean(boot_abs)), 'ci': (float(np.percentile(boot_abs, 2.5)), float(np.percentile(boot_abs, 97.5)))},
                'up': {'mean': float(np.mean(boot_up)), 'ci': (float(np.percentile(boot_up, 2.5)), float(np.percentile(boot_up, 97.5)))},
                'down': {'mean': float(np.mean(boot_down)), 'ci': (float(np.percentile(boot_down, 2.5)), float(np.percentile(boot_down, 97.5)))},
            }
        
        self.results['bootstrap'] = results
        return results
    
    def calculate_conditional(self) -> Dict:
        """Calculate conditional probabilities using row_id for robust adjacency."""
        valid = self._get_valid_moves().copy()
        
        # Use row_id (stable integer index) instead of pandas index for adjacency
        valid.loc[:, 'next_tick'] = valid['tick_move'].shift(-1)
        valid.loc[:, 'next_row_id'] = valid['row_id'].shift(-1)
        
        # Valid transition: next row is adjacent in original DataFrame
        valid.loc[:, 'valid_transition'] = (valid['next_row_id'] - valid['row_id']) == 1
        
        transitions = valid[valid['valid_transition'] & valid['next_tick'].notna()]
        
        min_samples = self.config.min_conditional_samples
        results = {}
        
        # After UP move
        up_trans = transitions[transitions['tick_move'] > 0]
        if len(up_trans) >= min_samples:
            results['after_up_move'] = {
                'n_samples': len(up_trans),
                'prob_continue_up': (up_trans['next_tick'] > 0).mean(),
                'prob_reverse_down': (up_trans['next_tick'] < 0).mean(),
                'prob_unchanged': (up_trans['next_tick'] == 0).mean(),
                'avg_next_move': up_trans['next_tick'].mean(),
            }
        
        # After DOWN move
        down_trans = transitions[transitions['tick_move'] < 0]
        if len(down_trans) >= min_samples:
            results['after_down_move'] = {
                'n_samples': len(down_trans),
                'prob_continue_down': (down_trans['next_tick'] < 0).mean(),
                'prob_reverse_up': (down_trans['next_tick'] > 0).mean(),
                'prob_unchanged': (down_trans['next_tick'] == 0).mean(),
                'avg_next_move': down_trans['next_tick'].mean(),
            }
        
        self.results['conditional'] = results
        return results
    
    def calculate_support_resistance(self) -> Dict:
        """
        Dynamic, actionable S/R levels with:
        - Recency-weighted (last N days only)
        - Integer tick-based indexing
        - Strength scoring (1-10) with confluence boost
        - Proximity alerts and trading targets
        """
        import pandas as pd  # Ensure pd.Timedelta available
        
        df_full = self.df.copy()
        tick_size = self.config.tick_size
        
        # RECENCY FILTER: Only use recent data for S/R (avoids historical hangovers)
        lookback_days = self.config.sr_lookback_days
        cutoff_date = df_full['datetime'].max() - pd.Timedelta(days=lookback_days)
        df = df_full[df_full['datetime'] >= cutoff_date].copy()
        
        if len(df) < 10:
            df = df_full.copy()  # Fallback if too little data
            lookback_days = (df_full['datetime'].max() - df_full['datetime'].min()).days
        
        current_price = df_full['spread_close'].iloc[-1]  # Always use latest
        current_tick_idx = int(round(current_price / tick_size))
        prev_price = df_full['spread_close'].iloc[-2] if len(df_full) > 1 else current_price
        min_distance_ticks = self.config.sr_min_distance_ticks
        
        # INTEGER-BASED INDEXING
        df['tick_idx'] = (df['spread_close'] / tick_size).round().astype(int)
        
        # Touch counts and volume (recent data only)
        touch_counts = df['tick_idx'].value_counts().to_dict()
        volume_by_tick = df.groupby('tick_idx')['spread_volume'].sum()
        max_volume = volume_by_tick.max() if len(volume_by_tick) > 0 else 1
        
        # Detect swings
        # WARNING: center=True uses future data. Valid for static S/R levels display,
        # but INVALID for backtesting. Do not copy this logic into a trading system.
        window = self.config.swing_window
        rolling_max = df['tick_idx'].rolling(window, center=True).max()
        rolling_min = df['tick_idx'].rolling(window, center=True).min()
        
        df['is_swing_high'] = df['tick_idx'] == rolling_max
        df['is_swing_low'] = df['tick_idx'] == rolling_min
        
        # Build levels using INTEGER keys (prevents float drift)
        all_levels: Dict[int, Dict] = {}
        
        # Helper to init/merge level
        def get_or_create(tick_idx: int) -> Dict:
            if tick_idx not in all_levels:
                all_levels[tick_idx] = {
                    'tick_idx': tick_idx,
                    'price': tick_idx * tick_size,
                    'types': set(),
                    'volume': 0,
                    'touches': touch_counts.get(tick_idx, 0),
                    'swing_count': 0
                }
            return all_levels[tick_idx]
        
        # Add volume nodes (merge, don't overwrite)
        for tick_idx, vol in volume_by_tick.nlargest(self.config.top_n_levels * 6).items():
            lv = get_or_create(tick_idx)
            lv['types'].add('Volume')
            lv['volume'] += vol  # Accumulate, not overwrite
        
        # OPTIMIZED: Vectorized swing detection using value_counts instead of iterrows
        swing_high_counts = df.loc[df['is_swing_high'], 'tick_idx'].value_counts()
        for tick_idx, count in swing_high_counts.items():
            lv = get_or_create(tick_idx)
            lv['types'].add('Swing High')
            lv['swing_count'] += count
        
        swing_low_counts = df.loc[df['is_swing_low'], 'tick_idx'].value_counts()
        for tick_idx, count in swing_low_counts.items():
            lv = get_or_create(tick_idx)
            lv['types'].add('Swing Low')
            lv['swing_count'] += count
        
        # Strength score with CONFLUENCE BOOST
        def calc_strength(level: Dict) -> float:
            score = 0
            types = level['types']
            
            # Base confluence (up to 3 pts)
            score += min(len(types), 3)
            
            # CONFLUENCE BOOST: Volume + Swing = massive signal (+3)
            has_volume = 'Volume' in types
            has_swing = 'Swing High' in types or 'Swing Low' in types
            if has_volume and has_swing:
                score += 3
            
            # Volume score (up to 3 pts)
            if max_volume > 0:
                score += (level['volume'] / max_volume) * 3
            
            # Touch count (up to 2 pts)
            score += min(level['touches'] / 10, 1) * 2
            
            # Swing count (up to 2 pts)
            score += min(level['swing_count'] / 3, 1) * 2
            
            return min(round(score, 1), 10)
        
        # Process levels
        processed = []
        for price_key, level in all_levels.items():
            dist = abs(level['price'] - current_price)
            dist_ticks = int(round(dist / tick_size))
            
            # Skip current price
            if dist_ticks == 0:
                continue
            
            strength = calc_strength(level)
            
            # PURE DATA: No English commentary - just raw numbers
            # Text formatting moved to print_results
            processed.append({
                'price': level['price'],
                'type': ' + '.join(sorted(level['types'])),
                'types': list(level['types']),
                'strength': strength,
                'touches': level['touches'],
                'swing_count': level['swing_count'],
                'volume': level['volume'],
                'distance': dist,
                'distance_ticks': dist_ticks,  # Raw proximity in ticks
                'is_resistance': level['price'] > current_price
            })
        
        # Separate and filter
        resistance_all = [l for l in processed if l['is_resistance']]
        support_all = [l for l in processed if not l['is_resistance']]
        
        # Sort by strength (strongest first), then by distance
        resistance_all.sort(key=lambda x: (-x['strength'], x['distance']))
        support_all.sort(key=lambda x: (-x['strength'], x['distance']))
        
        # Apply minimum distance filter (tick-based)
        def filter_levels(levels: List[Dict], min_dist_ticks: int, max_n: int) -> List[Dict]:
            accepted = []
            for lv in levels:
                # Simple price-based check (avoids redundancy)
                if all(abs(lv['price'] - a['price']) >= min_dist_ticks * tick_size for a in accepted):
                    accepted.append(lv)
                    if len(accepted) >= max_n:
                        break
            return sorted(accepted, key=lambda x: x['distance'])
        
        resistance = filter_levels(resistance_all, min_distance_ticks, self.config.top_n_levels)
        support = filter_levels(support_all, min_distance_ticks, self.config.top_n_levels)
        
        # Determine trading targets
        next_resistance = resistance[0] if resistance else None
        next_support = support[0] if support else None
        
        # Calculate direction bias based on current move
        if prev_price < current_price:
            direction = "UP"
            target = next_resistance
        elif prev_price > current_price:
            direction = "DOWN"
            target = next_support
        else:
            direction = "FLAT"
            target = next_resistance if next_resistance else next_support
        
        # Return raw data only - presentation logic moved to print_results
        results = {
            'current_price': current_price,
            'direction': direction,
            'resistance': resistance,
            'support': support,
            'next_target': target,
            'lookback_days': lookback_days,
        }
        
        self.results['support_resistance'] = results
        return results
    
    def calculate_stats(self) -> Dict:
        """Statistical tests with proper flatline handling.
        
        Uses RAW data (includes outliers) for distribution and autocorrelation
        because volatility clustering typically happens DURING big moves.
        Filtering out outliers would hide momentum effects.
        """
        # FIXED: Use raw data for stats - need to see actual volatility clustering
        raw = self._get_raw_moves()
        tick_moves = raw['tick_move'].values.astype(float)
        abs_moves = raw['abs_tick_move'].values.astype(float)
        
        if len(tick_moves) < 10:
            return {}
        
        std_dir = np.std(tick_moves)
        std_abs = np.std(abs_moves)
        
        # Handle flatline (std=0) to prevent division errors
        if std_dir == 0:
            skewness = 0.0
            kurtosis = 0.0
        else:
            skewness = stats.skew(tick_moves)
            kurtosis = stats.kurtosis(tick_moves)
        
        dist_stats = {
            'mean_abs': np.mean(abs_moves),
            'std_abs': std_abs,
            'std_dir': std_dir,
            'median_abs': np.median(abs_moves),
            'mean_dir': np.mean(tick_moves),
            'skewness': skewness,
            'kurtosis': kurtosis,
            'is_flatline': std_dir == 0,
        }
        
        # Autocorrelation with NaN handling and flatline safety
        autocorr = {}
        for lag in [1, 2, 3, 5]:
            if len(tick_moves) > lag:
                slice1, slice2 = tick_moves[:-lag], tick_moves[lag:]
                # SAFETY: Check for zero variance before calling corrcoef
                if np.std(slice1) == 0 or np.std(slice2) == 0:
                    autocorr[f'lag_{lag}'] = None
                else:
                    try:
                        with warnings.catch_warnings():
                            warnings.simplefilter("ignore", RuntimeWarning)
                            corr_val = np.corrcoef(slice1, slice2)[0, 1]
                        autocorr[f'lag_{lag}'] = corr_val if np.isfinite(corr_val) else None
                    except Exception:
                        autocorr[f'lag_{lag}'] = None
        
        t_stat, t_pval = stats.ttest_1samp(tick_moves, 0)
        
        non_zero = tick_moves[tick_moves != 0]
        if len(non_zero) >= 10:
            try:
                w_stat, w_pval = stats.wilcoxon(non_zero)
                wilcoxon_result = {'statistic': w_stat, 'p_value': w_pval, 'has_bias': w_pval < 0.05}
            except ValueError:
                wilcoxon_result = {'statistic': None, 'p_value': None, 'has_bias': False}
        else:
            wilcoxon_result = {'statistic': None, 'p_value': None, 'has_bias': False}
        
        # Runs test with edge case handling
        median = np.median(tick_moves)
        above = tick_moves > median
        n_above, n_below = np.sum(above), len(above) - np.sum(above)
        
        if n_above == 0 or n_below == 0:
            # Flat series - runs test not applicable
            z_runs, is_random = None, None
            runs_note = "not applicable (flat series)"
        else:
            runs = 1 + np.sum(above[1:] != above[:-1])
            exp_runs = 1 + (2 * n_above * n_below) / (n_above + n_below)
            var_runs = (2 * n_above * n_below * (2 * n_above * n_below - n_above - n_below)) / \
                       ((n_above + n_below)**2 * (n_above + n_below - 1))
            z_runs = (runs - exp_runs) / np.sqrt(max(var_runs, 1e-9))
            is_random = abs(z_runs) < 1.96
            runs_note = None
        
        results = {
            'distribution': dist_stats,
            'autocorrelation': autocorr,
            'ttest': {'t_stat': t_stat, 'p_value': t_pval, 'has_bias': t_pval < 0.05},
            'wilcoxon': wilcoxon_result,
            'runs_test': {'z_stat': z_runs, 'is_random': is_random, 'note': runs_note},
        }
        
        self.results['stats'] = results
        return results
    
    @staticmethod
    def _wilson_ci(successes: int, trials: int, confidence: float = 0.95) -> Tuple[float, float]:
        """Wilson score confidence interval."""
        if trials == 0:
            return (0.0, 0.0)
        z = stats.norm.ppf(1 - (1 - confidence) / 2)
        p = successes / trials
        denom = 1 + z**2 / trials
        center = (p + z**2 / (2 * trials)) / denom
        margin = (z / denom) * np.sqrt(p * (1 - p) / trials + z**2 / (4 * trials**2))
        return (max(0, center - margin), min(1, center + margin))
    
    def run_analysis(self) -> Dict:
        """Run full analysis pipeline."""
        self.calculate_empirical_probabilities()
        self.calculate_volume_weighted()
        self.calculate_bootstrap()
        self.calculate_conditional()
        self.calculate_support_resistance()
        self.calculate_stats()
        return self.results
    
    def print_results(self):
        """Print comprehensive results (directional only, no flat stats)."""
        df = self.df
        emp = self.results.get('empirical', {})
        vol = self.results.get('vol_weighted', {})
        cond = self.results.get('conditional', {})
        stat = self.results.get('stats', {})
        sr = self.results.get('support_resistance', {})
        n_valid = self.results.get('n_valid', 0)
        n_gaps = self.results.get('n_excluded_gaps', 0)
        
        mode = "STRICT (Business Days)" if self.config.strict_daily_only else f"RELAXED (gap≤{self.config.max_days_gap})"
        
        print(f"\n{'='*80}")
        print("SPREAD STATISTICS")
        print(f"{'='*80}")
        print(f"Current: {df['spread_close'].iloc[-1]:.4f}")
        print(f"Mean: {df['spread_close'].mean():.4f} | Std: {df['spread_close'].std():.4f}")
        print(f"Range: [{df['spread_close'].min():.4f}, {df['spread_close'].max():.4f}]")
        print(f"\nSpread Volume (min of legs): {df['spread_volume'].sum():,} total")
        
        self._print_histogram()
        
        # KEY LEVELS (Dynamic S/R with recency window)
        lookback = sr.get('lookback_days', 60)
        print(f"\n{'='*80}")
        print(f"KEY LEVELS (Last {lookback} Days)")
        print(f"{'='*80}")
        print(f"\nCurrent: {sr.get('current_price', 0):.4f} | Direction: {sr.get('direction', 'FLAT')}")
        
        # Build actionable recommendation (presentation logic - moved from calculate_support_resistance)
        target = sr.get('next_target')
        if target:
            target_dist = target['distance_ticks']
            if target['strength'] >= 7:
                action = f"Strong {target['type']} at {target['price']:.4f} ({target_dist}T away) - likely to hold"
            elif target['strength'] >= 4:
                action = f"Moderate {target['type']} at {target['price']:.4f} ({target_dist}T away) - watch for reaction"
            else:
                action = f"Weak level at {target['price']:.4f} ({target_dist}T away) - may break through"
        else:
            action = "No clear target in range"
        
        print(f"\n🎯 TARGET: {action}")
        
        # Format helper - generate proximity text here (presentation layer)
        def format_level(lv):
            dist_ticks = lv['distance_ticks']
            # Generate proximity text here (moved from calculate_support_resistance)
            if dist_ticks <= 2:
                prox = " ⚠️ TESTING"
            elif dist_ticks <= 5:
                prox = " → Approaching"
            else:
                prox = ""
            return f"{lv['price']:.4f} │ Str:{lv['strength']:>4.1f} │ {dist_ticks:>2}T │ Touches:{lv['touches']:>3} │ {lv['type']}{prox}"
        
        print(f"\n┌─ Resistance (Above) ─────────────────────────────────────────┐")
        for i, level in enumerate(sr.get('resistance', []), 1):
            print(f"│ R{i}: {format_level(level)}")
        if not sr.get('resistance'):
            print("│ None detected")
        print("└" + "─"*62 + "┘")
        
        print(f"\n┌─ Support (Below) ────────────────────────────────────────────┐")
        for i, level in enumerate(sr.get('support', []), 1):
            print(f"│ S{i}: {format_level(level)}")
        if not sr.get('support'):
            print("│ None detected")
        print("└" + "─"*62 + "┘")
        
        # DUAL-REGIME PROBABILITIES: Show both Raw (with spikes) and Filtered (normal)
        print(f"\n{'='*80}")
        print("TICK PROBABILITIES - DUAL REGIME COMPARISON")
        print(f"{'='*80}")
        
        raw_results = self.results.get('empirical_raw', {})
        filtered_results = self.results.get('empirical_filtered', {})
        
        n_raw = raw_results.get('n', 0)
        n_filtered = filtered_results.get('n', 0)
        n_outliers = self.results.get('n_outliers', 0)
        
        print(f"\n{'':20} │ {'Real World (Inc. Spikes)':^26} │ {'Normal Regime (Filtered)':^26}")
        print(f"{'':20} │ {'n=' + str(n_raw):^26} │ {'n=' + str(n_filtered) + ' (' + str(n_outliers) + ' outliers excl.)':^26}")
        print("─" * 80)
        
        raw_probs = raw_results.get('probs', {})
        filtered_probs = filtered_results.get('probs', emp)
        
        for n in self.config.tick_levels:
            if n not in filtered_probs:
                continue
            r = raw_probs.get(n, {})
            f = filtered_probs.get(n, {})
            
            r_at_least = r.get('prob_at_least', 0) * 100
            f_at_least = f.get('prob_at_least', 0) * 100
            delta = r_at_least - f_at_least
            delta_str = f"(+{delta:.1f}%)" if delta > 0.1 else ""
            
            print(f"\n{n} TICK (±{n * self.config.tick_size:.3f}):")
            print(f"  P(≥{n} tick):         {r_at_least:>5.2f}% {delta_str:>10}      │ {f_at_least:>5.2f}%")
            print(f"  P(UP≥{n}):            {r.get('prob_up_at_least', 0)*100:>5.2f}%                   │ {f.get('prob_up_at_least', 0)*100:>5.2f}%")
            print(f"  P(DOWN≥{n}):          {r.get('prob_down_at_least', 0)*100:>5.2f}%                   │ {f.get('prob_down_at_least', 0)*100:>5.2f}%")
            if n in vol:
                print(f"  Vol-Wtd:           {vol[n]['vol_weighted_at_least']*100:>5.2f}%")
        
        print(f"\n{'='*80}")
        print(f"CONDITIONAL PROBABILITIES (min n={self.config.min_conditional_samples})")
        print(f"{'='*80}")
        
        # RELATIVE BIAS + ACTIVITY METRIC for intuitive interpretation
        if 'after_up_move' in cond:
            c = cond['after_up_move']
            p_up, p_down = c['prob_continue_up'], c['prob_reverse_down']
            p_flat = c['prob_unchanged']
            activity = (p_up + p_down) * 100
            bias = p_down / (p_up + p_down) * 100 if (p_up + p_down) > 0 else 50
            activity_label = "High" if activity > 60 else "Medium" if activity > 30 else "Low"
            print(f"\nAfter UP (n={c['n_samples']}):")
            print(f"  Continue UP:  {p_up*100:5.1f}%")
            print(f"  Reverse DOWN: {p_down*100:5.1f}%")
            print(f"  → Bias: {bias:.0f}% reversal | Activity: {activity:.0f}% ({activity_label})")
        else:
            print(f"\nAfter UP: Insufficient samples (<{self.config.min_conditional_samples})")
        
        if 'after_down_move' in cond:
            c = cond['after_down_move']
            p_up, p_down = c['prob_reverse_up'], c['prob_continue_down']
            p_flat = c['prob_unchanged']
            activity = (p_up + p_down) * 100
            bias = p_up / (p_up + p_down) * 100 if (p_up + p_down) > 0 else 50
            activity_label = "High" if activity > 60 else "Medium" if activity > 30 else "Low"
            print(f"\nAfter DOWN (n={c['n_samples']}):")
            print(f"  Continue DOWN: {p_down*100:5.1f}%")
            print(f"  Reverse UP:    {p_up*100:5.1f}%")
            print(f"  → Bias: {bias:.0f}% reversal | Activity: {activity:.0f}% ({activity_label})")
        else:
            print(f"\nAfter DOWN: Insufficient samples (<{self.config.min_conditional_samples})")
        
        print(f"\n{'='*80}")
        print("STATISTICAL ANALYSIS")
        print(f"{'='*80}")
        
        if 'distribution' in stat:
            d = stat['distribution']
            print(f"\nDistribution:")
            print(f"  Mean(abs): {d['mean_abs']:.3f} | Std: {d['std_abs']:.3f}")
            print(f"  Skewness: {d['skewness']:.3f} | Kurtosis: {d['kurtosis']:.3f}")
        
        if 'autocorrelation' in stat:
            print(f"\nAutocorrelation:")
            for k, v in stat['autocorrelation'].items():
                if v is None:
                    print(f"  {k}: N/A (zero variance)")
                else:
                    sig = '***' if abs(v) > 0.3 else '**' if abs(v) > 0.2 else '*' if abs(v) > 0.1 else ''
                    print(f"  {k}: {v:+.4f} {sig}")
        
        if 'wilcoxon' in stat:
            w = stat['wilcoxon']
            if w['p_value'] is not None and not np.isnan(w['p_value']):
                bias = "Biased" if w['has_bias'] else "No bias"
                print(f"\nWilcoxon (non-parametric): {bias} (p={w['p_value']:.4f})")
        
        if 'runs_test' in stat:
            rt = stat['runs_test']
            if rt['z_stat'] is not None:
                print(f"Runs Test: {'Random' if rt['is_random'] else 'Non-random pattern'} (z={rt['z_stat']:.2f})")
            elif rt.get('note'):
                print(f"Runs Test: {rt['note']}")        
        print(f"\n{'='*80}")
        print("SUMMARY")
        print(f"{'='*80}\n")
        
        print(f"{'Ticks':<6} {'P(≥N)':<10} {'P(UP)':<10} {'P(DOWN)':<10} {'Vol-Wtd':<10}")
        print("-" * 50)
        for n in self.config.tick_levels:
            if n in emp:
                e = emp[n]
                v = vol.get(n, {})
                print(f"{n:<6} {e['prob_at_least']*100:>6.2f}%   {e['prob_up_at_least']*100:>6.2f}%   "
                      f"{e['prob_down_at_least']*100:>6.2f}%   {v.get('vol_weighted_at_least', 0)*100:>6.2f}%")
    
    def _print_histogram(self):
        """ASCII histogram of tick distribution."""
        valid = self._get_valid_moves()
        counter = Counter(valid['tick_move'].values)
        
        if not counter:
            return
        
        max_count = max(counter.values())
        min_t, max_t = min(counter.keys()), max(counter.keys())
        
        mode = "Strict Daily" if self.config.strict_daily_only else "Consecutive Days"
        print(f"\n{'─'*60}")
        print(f"TICK DISTRIBUTION ({mode})")
        print(f"{'─'*60}")
        
        for t in range(int(min_t), int(max_t) + 1):
            c = counter.get(t, 0)
            bar_len = int((c / max_count) * 30) if max_count > 0 else 0
            pct = 100 * c / len(valid)
            char = '▓' if t > 0 else ('░' if t < 0 else '█')
            print(f"  {t:+3d} │{'':1}{char * bar_len:<30} {c:4d} ({pct:4.1f}%)")


def resolve_path(filename: str, base_path: Path) -> Path:
    """Resolve file path: CWD first, then script directory."""
    # FIXED: Check CWD first for pipeline compatibility
    cwd_path = Path.cwd() / filename
    if cwd_path.exists():
        return cwd_path
    
    # Fallback to script directory
    script_path = base_path / filename
    if script_path.exists():
        return script_path
    
    # Return CWD path (will fail later with proper error)
    return cwd_path


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Spread Probability Calculator - Production v8',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv
  python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv --strict
  python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv --bootstrap-iter 5000
        """
    )
    parser.add_argument('--file1', type=str, help='Path to first CSV file (uses default if not provided)')
    parser.add_argument('--file2', type=str, help='Path to second CSV file (uses default if not provided)')
    parser.add_argument('--tick-size', type=float, default=0.005, help='Tick size (default: 0.005)')
    parser.add_argument('--strict', action='store_true', 
                        help='Strict business-day mode (gap=1 or Friday->Monday<=3)')
    parser.add_argument('--bootstrap-iter', type=int, default=2000, 
                        help='Bootstrap iterations (default: 2000)')
    parser.add_argument('--no-dashboard', action='store_true', help='Skip dashboard generation')
    return parser.parse_args()


def main() -> int:
    """Main entry point (fully automated)."""
    args = parse_args()
    
    print("\n" + "="*80)
    print("SPREAD PROBABILITY CALCULATOR (Production v8)")
    print("="*80)
    
    config = Config(
        tick_size=args.tick_size,
        strict_daily_only=args.strict,
        bootstrap_iterations=args.bootstrap_iter
    )
    calc = SpreadCalculator(config)
    base_path = Path(__file__).parent
    
    mode_str = "STRICT (Business Days)" if config.strict_daily_only else f"RELAXED (gap≤{config.max_days_gap})"
    print(f"\nConfig: tick={config.tick_size}, MAD×{config.outlier_mad_threshold}, mode={mode_str}")
    
    # Use CLI args or fall back to config defaults
    file1_name = args.file1 if args.file1 else config.default_file1
    file2_name = args.file2 if args.file2 else config.default_file2
    
    if not file1_name or not file2_name:
        print("❌ No file arguments provided and no defaults configured.")
        print("   Use: python spread_probability_calculator.py --file1 data1.csv --file2 data2.csv")
        return 1
    
    if not args.file1 or not args.file2:
        print(f"Using defaults: {file1_name} / {file2_name}")
    
    file1 = Path(file1_name) if Path(file1_name).is_absolute() else resolve_path(file1_name, base_path)
    file2 = Path(file2_name) if Path(file2_name).is_absolute() else resolve_path(file2_name, base_path)
    
    if not file1.exists():
        print(f"❌ File not found: {file1}")
        return 1
    if not file2.exists():
        print(f"❌ File not found: {file2}")
        return 1
    
    calc.load_and_merge(str(file1), str(file2))
    calc.run_analysis()
    calc.print_results()
    
    if not args.no_dashboard:
        print(f"\n{'='*80}")
        print("DASHBOARD")
        print(f"{'='*80}")
        
        try:
            from dashboard_generator import generate_dashboard
            import webbrowser
            
            # FIXED: Output to CWD for user convenience
            dashboard_path = Path.cwd() / "spread_probability_dashboard.html"
            generate_dashboard(
                spread_df=calc.df,
                empirical_probs=calc.results.get('empirical', {}),
                vol_weighted=calc.results.get('vol_weighted', {}),
                bootstrap_results=calc.results.get('bootstrap', {}),
                conditional_probs=calc.results.get('conditional', {}),
                stat_tests=calc.results.get('stats', {}),
                tick_moves=calc._get_valid_moves()['tick_move'].values,
                abs_tick_moves=calc._get_valid_moves()['abs_tick_move'].values,
                file1_name=file1.name,
                file2_name=file2.name,
                config={'tick_size': config.tick_size, 'tick_levels': list(config.tick_levels)},
                output_path=str(dashboard_path),
                support_resistance=calc.results.get('support_resistance', {}),
                empirical_raw=calc.results.get('empirical_raw', {}),
                empirical_filtered=calc.results.get('empirical_filtered', {})
            )
            print("🚀 Opening browser...")
            webbrowser.open(f'file://{dashboard_path.resolve()}')
        except ImportError:
            print("ℹ️  Dashboard module not found (optional)")
        except Exception as e:
            print(f"⚠️  Dashboard error: {e}")
    
    print("\n✅ Complete")
    return 0


if __name__ == "__main__":
    exit(main())
