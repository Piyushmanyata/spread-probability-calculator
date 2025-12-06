/**
 * Spread Probability Calculator - JavaScript Port
 * 
 * Ported from Python spread_probability_calculator.py (Production v8)
 * All calculations run client-side in the browser.
 */

import jStat from 'jstat';
import Papa from 'papaparse';

// Default configuration
export const DEFAULT_CONFIG = {
    tickSize: 0.005,
    tickLevels: [1, 2, 3],
    outlierMadThreshold: 4.0,
    minOutlierTicks: 10,
    maxDaysGap: 3,
    strictDailyOnly: false,
    minExpandingWindow: 20,
    minConditionalSamples: 30,
    swingWindow: 5,
    topNLevels: 3,
    srMinDistanceTicks: 4,
    srLookbackDays: 60,
    bootstrapIterations: 500, // Reduced for browser performance
};

/**
 * Parse CSV text into array of objects using PapaParse
 * Properly handles quoted fields, commas in values, etc.
 */
export function parseCSV(text) {
    const result = Papa.parse(text.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (result.errors.length > 0) {
        const firstError = result.errors[0];
        throw new Error(`CSV parse error at row ${firstError.row}: ${firstError.message}`);
    }

    // Validate required columns
    const required = ['datetime', 'open', 'high', 'low', 'close', 'volume'];
    const headers = result.meta.fields.map(f => f.toLowerCase());
    const missing = required.filter(col => !headers.includes(col));
    if (missing.length > 0) {
        throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }

    const data = [];
    for (const row of result.data) {
        const parsed = {
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume),
            datetime: new Date(row.datetime),
        };

        if (!isNaN(parsed.close) && !isNaN(parsed.datetime.getTime())) {
            data.push(parsed);
        }
    }

    return data;
}

/**
 * Get date key in YYYY-MM-DD format
 */
function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Calculate days between two dates
 */
function daysBetween(d1, d2) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((d2 - d1) / msPerDay);
}

/**
 * Simple seeded PRNG (mulberry32) for reproducible bootstrap sampling
 * @param {number} seed - Initial seed value
 * @returns {function} - Function that returns next random number [0,1)
 */
function seededRandom(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Calculate expanding median
 */
function expandingMedian(arr, minPeriods) {
    const result = new Array(arr.length).fill(NaN);
    for (let i = minPeriods - 1; i < arr.length; i++) {
        // Create a copy of the window to avoid mutating original
        const window = arr.slice(0, i + 1).filter(v => !isNaN(v));
        if (window.length >= minPeriods) {
            // Sort is safe here since slice() creates a new array
            window.sort((a, b) => a - b);
            const mid = Math.floor(window.length / 2);
            result[i] = window.length % 2 ? window[mid] : (window[mid - 1] + window[mid]) / 2;
        }
    }
    return result;
}

/**
 * Wilson score confidence interval
 */
function wilsonCI(successes, trials, confidence = 0.95) {
    if (trials === 0) return [0, 0];
    const z = jStat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
    const p = successes / trials;
    const denom = 1 + (z * z) / trials;
    const center = (p + (z * z) / (2 * trials)) / denom;
    const margin = (z / denom) * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

/**
 * Main calculator class
 */
export class SpreadCalculator {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.df = null;
        this.dfRaw = null;
        this.dfValid = null;
        this.results = {};
    }

    /**
     * Load and merge two CSV datasets
     */
    loadAndMerge(data1, data2) {
        // Sort by datetime
        data1.sort((a, b) => a.datetime - b.datetime);
        data2.sort((a, b) => a.datetime - b.datetime);

        // Add date keys and deduplicate (keep last of day)
        const dedup = (data) => {
            const byDate = new Map();
            data.forEach(row => {
                const key = getDateKey(row.datetime);
                byDate.set(key, row); // Last wins
            });
            return Array.from(byDate.entries()).map(([key, row]) => ({ ...row, dateKey: key }));
        };

        const df1 = dedup(data1);
        const df2 = dedup(data2);

        // Merge on date key
        const df2Map = new Map(df2.map(r => [r.dateKey, r]));
        const merged = [];

        df1.forEach(row1 => {
            const row2 = df2Map.get(row1.dateKey);
            if (row2) {
                merged.push({
                    datetime: row1.datetime,
                    dateKey: row1.dateKey,
                    close1: row1.close,
                    close2: row2.close,
                    volume1: row1.volume,
                    volume2: row2.volume,
                });
            }
        });

        // Sort merged data
        merged.sort((a, b) => a.datetime - b.datetime);

        // Calculate spread and tick moves
        const tickSize = this.config.tickSize;
        let prevRow = null;

        merged.forEach((row, idx) => {
            row.rowId = idx;
            row.spreadClose = row.close1 - row.close2;
            row.spreadVolume = Math.min(row.volume1, row.volume2);

            if (prevRow) {
                row.priceChange = row.spreadClose - prevRow.spreadClose;
                row.tickMove = Math.round(row.priceChange / tickSize);
                row.absTickMove = Math.abs(row.tickMove);
                row.daysGap = daysBetween(prevRow.datetime, row.datetime);
            } else {
                row.priceChange = null;
                row.tickMove = null;
                row.absTickMove = null;
                row.daysGap = null;
            }

            prevRow = row;
        });

        // Mark consecutive days - use config value
        const maxGap = this.config.strictDailyOnly ? this.config.maxDaysGap : this.config.maxDaysGap + 2;
        merged.forEach((row, idx) => {
            if (idx === 0) {
                row.isConsecutive = true;
            } else {
                row.isConsecutive = row.daysGap !== null && row.daysGap <= maxGap;
            }
        });

        // Expanding-window MAD outlier detection
        const tickMoves = merged.map(r => r.tickMove);
        const minPeriods = this.config.minExpandingWindow;
        const rollingMedian = expandingMedian(tickMoves, minPeriods);

        // Calculate MAD
        const rollingMAD = new Array(merged.length).fill(NaN);
        for (let i = minPeriods - 1; i < merged.length; i++) {
            const window = tickMoves.slice(0, i + 1).filter(v => v !== null && !isNaN(v));
            if (window.length >= minPeriods) {
                const med = rollingMedian[i];
                const deviations = window.map(v => Math.abs(v - med));
                deviations.sort((a, b) => a - b);
                const mid = Math.floor(deviations.length / 2);
                const mad = deviations.length % 2 ? deviations[mid] : (deviations[mid - 1] + deviations[mid]) / 2;
                rollingMAD[i] = mad * 1.4826;
            }
        }

        // Mark outliers and warm-up
        merged.forEach((row, idx) => {
            const isWarmup = isNaN(rollingMedian[idx]) || isNaN(rollingMAD[idx]);
            row.isWarmup = isWarmup;

            if (isWarmup || row.tickMove === null) {
                row.isOutlier = false;
            } else {
                const threshold = this.config.outlierMadThreshold * Math.max(
                    rollingMAD[idx] || this.config.minOutlierTicks,
                    this.config.minOutlierTicks
                );
                row.isOutlier = Math.abs(row.tickMove - rollingMedian[idx]) > threshold;
            }
        });

        this.df = merged;

        // Create filtered datasets
        this.dfRaw = merged.filter(r =>
            r.isConsecutive && r.tickMove !== null
        );

        this.dfValid = merged.filter(r =>
            !r.isOutlier && !r.isWarmup && r.isConsecutive && r.tickMove !== null
        );

        // Store metadata
        this.results.nValid = this.dfValid.length;
        this.results.nRaw = this.dfRaw.length;
        this.results.nOutliers = merged.filter(r => r.isOutlier).length;
        this.results.nWarmup = merged.filter(r => r.isWarmup).length;
        this.results.totalVolume = merged.reduce((sum, r) => sum + (r.spreadVolume || 0), 0);
        this.results.dateRange = {
            start: merged[0]?.datetime,
            end: merged[merged.length - 1]?.datetime,
        };
        this.results.currentPrice = merged[merged.length - 1]?.spreadClose;

        // Guard against empty merged array
        const spreadCloses = merged.map(r => r.spreadClose).filter(v => v !== undefined && !isNaN(v));
        this.results.spreadStats = spreadCloses.length > 0 ? {
            mean: jStat.mean(spreadCloses),
            std: jStat.stdev(spreadCloses, true),
            min: Math.min(...spreadCloses),
            max: Math.max(...spreadCloses),
        } : { mean: 0, std: 0, min: 0, max: 0 };

        return merged;
    }

    /**
     * Calculate empirical probabilities for a dataset
     * OPTIMIZED: Single pass through data for all tick levels
     */
    _computeProbs(data, label) {
        const n = data.length;
        if (n === 0) return { n: 0, label, probs: {} };

        // Initialize counters for all tick levels in single pass
        const tickLevels = this.config.tickLevels;
        const counts = {
            zero: 0,
        };
        tickLevels.forEach(nticks => {
            counts[nticks] = { exact: 0, atLeast: 0, up: 0, down: 0 };
        });

        // Single pass through data
        for (const r of data) {
            const tickMove = r.tickMove;
            const absTickMove = r.absTickMove;

            if (tickMove === 0) counts.zero++;

            for (const nticks of tickLevels) {
                if (absTickMove === nticks) counts[nticks].exact++;
                if (absTickMove >= nticks) counts[nticks].atLeast++;
                if (tickMove >= nticks) counts[nticks].up++;
                if (tickMove <= -nticks) counts[nticks].down++;
            }
        }

        // Build probs object
        const probs = {};

        probs[0] = {
            tickValue: 0,
            countExact: counts.zero,
            probExact: counts.zero / n,
            probExactCI: wilsonCI(counts.zero, n),
        };

        tickLevels.forEach(nticks => {
            const c = counts[nticks];
            probs[nticks] = {
                tickValue: nticks * this.config.tickSize,
                countExact: c.exact,
                probExact: c.exact / n,
                probExactCI: wilsonCI(c.exact, n),
                countAtLeast: c.atLeast,
                probAtLeast: c.atLeast / n,
                probAtLeastCI: wilsonCI(c.atLeast, n),
                countUp: c.up,
                probUpAtLeast: c.up / n,
                probUpCI: wilsonCI(c.up, n),
                countDown: c.down,
                probDownAtLeast: c.down / n,
                probDownCI: wilsonCI(c.down, n),
            };
        });

        return { n, label, probs };
    }

    /**
     * Calculate dual-regime empirical probabilities
     */
    calculateEmpiricalProbabilities() {
        const rawResults = this._computeProbs(this.dfRaw, 'Real World (Inc. Spikes)');
        const filteredResults = this._computeProbs(this.dfValid, 'Normal Regime');

        this.results.empiricalRaw = rawResults;
        this.results.empiricalFiltered = filteredResults;
        this.results.empirical = filteredResults.probs;

        return { raw: rawResults, filtered: filteredResults };
    }

    /**
     * Calculate volume-weighted probabilities
     * OPTIMIZED: Single pass through data for all tick levels
     */
    calculateVolumeWeighted() {
        const raw = this.dfRaw;
        if (raw.length === 0) return {};

        // Single pass calculation
        const tickLevels = this.config.tickLevels;
        let totalVol = 0;
        const volCounts = {};
        tickLevels.forEach(nticks => {
            volCounts[nticks] = { atLeast: 0, up: 0, down: 0 };
        });

        for (const r of raw) {
            const vol = r.spreadVolume;
            totalVol += vol;

            for (const nticks of tickLevels) {
                if (r.absTickMove >= nticks) volCounts[nticks].atLeast += vol;
                if (r.tickMove >= nticks) volCounts[nticks].up += vol;
                if (r.tickMove <= -nticks) volCounts[nticks].down += vol;
            }
        }

        if (totalVol === 0) return {};

        const results = {};
        tickLevels.forEach(nticks => {
            const c = volCounts[nticks];
            results[nticks] = {
                volWeightedAtLeast: c.atLeast / totalVol,
                volWeightedUp: c.up / totalVol,
                volWeightedDown: c.down / totalVol,
            };
        });

        this.results.volWeighted = results;
        return results;
    }

    /**
     * Calculate bootstrap confidence intervals
     * Uses seeded PRNG for reproducibility
     */
    calculateBootstrap(nIter = null, seed = 42) {
        if (nIter === null) nIter = this.config.bootstrapIterations;

        const valid = this.dfValid;
        const n = valid.length;
        if (n === 0) return {};

        const tickMoves = valid.map(r => r.tickMove);
        const absMoves = valid.map(r => r.absTickMove);

        // Create seeded RNG for reproducibility
        const rng = seededRandom(seed);

        // Percentile helper (moved outside loop for efficiency)
        const pct = (arr, p) => {
            const idx = p * (arr.length - 1);
            const lower = Math.floor(idx);
            const upper = Math.ceil(idx);
            if (lower === upper) return arr[lower];
            return arr[lower] * (upper - idx) + arr[upper] * (idx - lower);
        };

        const results = {};

        this.config.tickLevels.forEach(nticks => {
            const bootAbs = [];
            const bootUp = [];
            const bootDown = [];

            for (let iter = 0; iter < nIter; iter++) {
                let countAbs = 0, countUp = 0, countDown = 0;

                for (let i = 0; i < n; i++) {
                    const idx = Math.floor(rng() * n);
                    if (absMoves[idx] >= nticks) countAbs++;
                    if (tickMoves[idx] >= nticks) countUp++;
                    if (tickMoves[idx] <= -nticks) countDown++;
                }

                bootAbs.push(countAbs / n);
                bootUp.push(countUp / n);
                bootDown.push(countDown / n);
            }

            bootAbs.sort((a, b) => a - b);
            bootUp.sort((a, b) => a - b);
            bootDown.sort((a, b) => a - b);

            results[nticks] = {
                abs: {
                    mean: jStat.mean(bootAbs),
                    ci: [pct(bootAbs, 0.025), pct(bootAbs, 0.975)],
                },
                up: {
                    mean: jStat.mean(bootUp),
                    ci: [pct(bootUp, 0.025), pct(bootUp, 0.975)],
                },
                down: {
                    mean: jStat.mean(bootDown),
                    ci: [pct(bootDown, 0.025), pct(bootDown, 0.975)],
                },
            };
        });

        this.results.bootstrap = results;
        return results;
    }

    /**
     * Calculate conditional probabilities
     */
    calculateConditional() {
        const valid = [...this.dfValid];
        const minSamples = this.config.minConditionalSamples;
        const results = {};

        // Build transitions
        const transitions = [];
        for (let i = 0; i < valid.length - 1; i++) {
            const curr = valid[i];
            const next = valid[i + 1];
            // Check adjacency using rowId
            if (next.rowId - curr.rowId === 1) {
                transitions.push({
                    tickMove: curr.tickMove,
                    nextTick: next.tickMove,
                });
            }
        }

        // After UP move
        const upTrans = transitions.filter(t => t.tickMove > 0);
        if (upTrans.length >= minSamples) {
            results.afterUpMove = {
                nSamples: upTrans.length,
                probContinueUp: upTrans.filter(t => t.nextTick > 0).length / upTrans.length,
                probReverseDown: upTrans.filter(t => t.nextTick < 0).length / upTrans.length,
                probUnchanged: upTrans.filter(t => t.nextTick === 0).length / upTrans.length,
                avgNextMove: jStat.mean(upTrans.map(t => t.nextTick)),
            };
        }

        // After DOWN move
        const downTrans = transitions.filter(t => t.tickMove < 0);
        if (downTrans.length >= minSamples) {
            results.afterDownMove = {
                nSamples: downTrans.length,
                probContinueDown: downTrans.filter(t => t.nextTick < 0).length / downTrans.length,
                probReverseUp: downTrans.filter(t => t.nextTick > 0).length / downTrans.length,
                probUnchanged: downTrans.filter(t => t.nextTick === 0).length / downTrans.length,
                avgNextMove: jStat.mean(downTrans.map(t => t.nextTick)),
            };
        }

        this.results.conditional = results;
        return results;
    }

    /**
     * Calculate support/resistance levels
     */
    calculateSupportResistance() {
        const dfFull = [...this.df];
        const tickSize = this.config.tickSize;

        // FIX: Guard against empty data
        if (dfFull.length === 0) {
            return {
                currentPrice: 0,
                direction: 'FLAT',
                resistance: [],
                support: [],
                nextTarget: null,
                lookbackDays: 0,
            };
        }

        // Recency filter
        const lookbackDays = this.config.srLookbackDays;
        const maxDate = dfFull[dfFull.length - 1].datetime;
        const cutoffDate = new Date(maxDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

        let df = dfFull.filter(r => r.datetime >= cutoffDate);
        let actualLookback = lookbackDays;

        if (df.length < 10) {
            df = dfFull;
            actualLookback = dfFull.length > 1 ? daysBetween(dfFull[0].datetime, maxDate) : 0;
        }

        const currentPrice = dfFull[dfFull.length - 1].spreadClose;

        // Calculate tick indices
        df.forEach(r => {
            r.tickIdx = Math.round(r.spreadClose / tickSize);
        });

        // Touch counts and volume
        const touchCounts = {};
        const volumeByTick = {};
        df.forEach(r => {
            touchCounts[r.tickIdx] = (touchCounts[r.tickIdx] || 0) + 1;
            volumeByTick[r.tickIdx] = (volumeByTick[r.tickIdx] || 0) + r.spreadVolume;
        });

        const maxVolume = Math.max(...Object.values(volumeByTick), 1);

        // Detect swings using rolling window
        const window = this.config.swingWindow;
        const halfWin = Math.floor(window / 2);

        df.forEach((r, idx) => {
            const start = Math.max(0, idx - halfWin);
            const end = Math.min(df.length - 1, idx + halfWin);
            const windowSlice = df.slice(start, end + 1);
            const ticks = windowSlice.map(w => w.tickIdx);
            r.isSwingHigh = r.tickIdx === Math.max(...ticks);
            r.isSwingLow = r.tickIdx === Math.min(...ticks);
        });

        // Build levels
        const allLevels = {};

        const getOrCreate = (tickIdx) => {
            if (!allLevels[tickIdx]) {
                allLevels[tickIdx] = {
                    tickIdx,
                    price: tickIdx * tickSize,
                    types: new Set(),
                    volume: 0,
                    touches: touchCounts[tickIdx] || 0,
                    swingCount: 0,
                };
            }
            return allLevels[tickIdx];
        };

        // Add volume nodes
        const topVolumeKeys = Object.entries(volumeByTick)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.config.topNLevels * 6)
            .map(([k]) => parseInt(k));

        topVolumeKeys.forEach(tickIdx => {
            const lv = getOrCreate(tickIdx);
            lv.types.add('Volume');
            lv.volume = volumeByTick[tickIdx];
        });

        // Add swing points
        const swingHighCounts = {};
        const swingLowCounts = {};
        df.forEach(r => {
            if (r.isSwingHigh) swingHighCounts[r.tickIdx] = (swingHighCounts[r.tickIdx] || 0) + 1;
            if (r.isSwingLow) swingLowCounts[r.tickIdx] = (swingLowCounts[r.tickIdx] || 0) + 1;
        });

        Object.entries(swingHighCounts).forEach(([tickIdx, count]) => {
            const lv = getOrCreate(parseInt(tickIdx));
            lv.types.add('Swing High');
            lv.swingCount += count;
        });

        Object.entries(swingLowCounts).forEach(([tickIdx, count]) => {
            const lv = getOrCreate(parseInt(tickIdx));
            lv.types.add('Swing Low');
            lv.swingCount += count;
        });

        // Calculate strength
        const calcStrength = (level) => {
            let score = 0;
            const types = level.types;

            score += Math.min(types.size, 3);

            const hasVolume = types.has('Volume');
            const hasSwing = types.has('Swing High') || types.has('Swing Low');
            if (hasVolume && hasSwing) score += 3;

            if (maxVolume > 0) score += (level.volume / maxVolume) * 3;
            score += Math.min(level.touches / 10, 1) * 2;
            score += Math.min(level.swingCount / 3, 1) * 2;

            return Math.min(Math.round(score * 10) / 10, 10);
        };

        // Process levels
        const processed = [];
        Object.values(allLevels).forEach(level => {
            const dist = Math.abs(level.price - currentPrice);
            const distTicks = Math.round(dist / tickSize);

            if (distTicks === 0) return;

            processed.push({
                price: level.price,
                type: Array.from(level.types).sort().join(' + '),
                types: Array.from(level.types),
                strength: calcStrength(level),
                touches: level.touches,
                swingCount: level.swingCount,
                volume: level.volume,
                distance: dist,
                distanceTicks: distTicks,
                isResistance: level.price > currentPrice,
            });
        });

        // Separate and sort
        let resistance = processed.filter(l => l.isResistance);
        let support = processed.filter(l => !l.isResistance);

        resistance.sort((a, b) => b.strength - a.strength || a.distance - b.distance);
        support.sort((a, b) => b.strength - a.strength || a.distance - b.distance);

        // Filter by minimum distance
        const minDistTicks = this.config.srMinDistanceTicks;
        const filterLevels = (levels, maxN) => {
            const accepted = [];
            for (const lv of levels) {
                if (accepted.every(a => Math.abs(lv.price - a.price) >= minDistTicks * tickSize)) {
                    accepted.push(lv);
                    if (accepted.length >= maxN) break;
                }
            }
            return accepted.sort((a, b) => a.distance - b.distance);
        };

        resistance = filterLevels(resistance, this.config.topNLevels);
        support = filterLevels(support, this.config.topNLevels);

        // Determine direction using 5-day EMA trend (more robust than single day)
        let direction = 'FLAT';
        let target = null;
        let trendStrength = 0;

        // Calculate EMA with proper handling for short data
        const emaCalc = (data, periods) => {
            if (data.length === 0) return 0;
            if (data.length === 1) return data[0];
            // For short data, use all available points
            const effectivePeriods = Math.min(periods, data.length);
            const k = 2 / (effectivePeriods + 1);
            let ema = data.slice(0, effectivePeriods).reduce((a, b) => a + b) / effectivePeriods;
            for (let i = effectivePeriods; i < data.length; i++) {
                ema = data[i] * k + ema * (1 - k);
            }
            return ema;
        };

        const recentPrices = dfFull.slice(-5).map(r => r.spreadClose);
        const ema5 = emaCalc(recentPrices, 5);
        const priceDiff = currentPrice - ema5;
        const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);

        if (priceRange > 0) {
            trendStrength = Math.min(Math.abs(priceDiff / priceRange) * 100, 100);
        }

        if (priceDiff > tickSize * 0.5) {
            direction = 'UP';
            target = resistance[0] || null;
        } else if (priceDiff < -tickSize * 0.5) {
            direction = 'DOWN';
            target = support[0] || null;
        } else {
            target = resistance[0] || support[0] || null;
        }

        const results = {
            currentPrice,
            direction,
            trendStrength: Math.round(trendStrength),
            ema5,
            resistance,
            support,
            nextTarget: target,
            lookbackDays: actualLookback,
        };

        this.results.supportResistance = results;
        return results;
    }

    /**
     * Calculate statistical tests
     */
    calculateStats() {
        const raw = this.dfRaw;
        const tickMoves = raw.map(r => r.tickMove);
        const absMoves = raw.map(r => r.absTickMove);

        if (tickMoves.length < 10) return {};

        const stdDir = jStat.stdev(tickMoves, true);
        const stdAbs = jStat.stdev(absMoves, true);

        const distribution = {
            meanAbs: jStat.mean(absMoves),
            stdAbs,
            stdDir,
            medianAbs: jStat.median(absMoves),
            meanDir: jStat.mean(tickMoves),
            skewness: stdDir === 0 ? 0 : jStat.skewness(tickMoves),
            kurtosis: stdDir === 0 ? 0 : jStat.kurtosis(tickMoves) - 3, // Excess kurtosis
            isFlatline: stdDir === 0,
        };

        // Autocorrelation
        const autocorrelation = {};
        [1, 2, 3, 5].forEach(lag => {
            if (tickMoves.length > lag) {
                const slice1 = tickMoves.slice(0, -lag);
                const slice2 = tickMoves.slice(lag);

                const std1 = jStat.stdev(slice1, true);
                const std2 = jStat.stdev(slice2, true);

                if (std1 === 0 || std2 === 0) {
                    autocorrelation[`lag_${lag}`] = null;
                } else {
                    const mean1 = jStat.mean(slice1);
                    const mean2 = jStat.mean(slice2);
                    let sum = 0;
                    for (let i = 0; i < slice1.length; i++) {
                        sum += (slice1[i] - mean1) * (slice2[i] - mean2);
                    }
                    // FIX: Use n-1 for sample correlation
                    const corr = sum / ((slice1.length - 1) * std1 * std2);
                    autocorrelation[`lag_${lag}`] = isFinite(corr) ? corr : null;
                }
            }
        });

        // T-test with flatline guard
        const tStd = jStat.stdev(tickMoves, true);
        let ttest;
        if (tStd === 0) {
            ttest = {
                tStat: 0,
                pValue: 1,
                hasBias: false,
                note: 'flatline series',
            };
        } else {
            const tResult = jStat.ttest(tickMoves, 0, 2);
            ttest = {
                tStat: jStat.mean(tickMoves) / (tStd / Math.sqrt(tickMoves.length)),
                pValue: tResult,
                hasBias: tResult < 0.05,
            };
        }

        // Runs test
        const median = jStat.median(tickMoves);
        const above = tickMoves.map(t => t > median);
        const nAbove = above.filter(x => x).length;
        const nBelow = above.length - nAbove;

        let runsTest = { zStat: null, isRandom: null, note: null };

        if (nAbove === 0 || nBelow === 0) {
            runsTest.note = 'not applicable (flat series)';
        } else {
            let runs = 1;
            for (let i = 1; i < above.length; i++) {
                if (above[i] !== above[i - 1]) runs++;
            }
            const expRuns = 1 + (2 * nAbove * nBelow) / (nAbove + nBelow);
            const varRuns = (2 * nAbove * nBelow * (2 * nAbove * nBelow - nAbove - nBelow)) /
                ((nAbove + nBelow) ** 2 * (nAbove + nBelow - 1));
            const zRuns = (runs - expRuns) / Math.sqrt(Math.max(varRuns, 1e-9));
            runsTest = {
                zStat: zRuns,
                isRandom: Math.abs(zRuns) < 1.96,
                note: null,
            };
        }

        const results = {
            distribution,
            autocorrelation,
            ttest,
            runsTest,
        };

        this.results.stats = results;
        return results;
    }

    /**
     * Calculate streak probabilities
     * Analyzes consecutive UP/DOWN patterns
     */
    calculateStreaks() {
        const valid = this.dfValid;
        if (valid.length < 3) return {};

        let currentStreak = 0;
        let currentDirection = 0; // 1=up, -1=down
        const upStreaks = [];
        const downStreaks = [];

        // Count consecutive streaks
        let consecutiveUp = 0;
        let consecutiveDown = 0;
        let twoUpCount = 0;
        let twoDownCount = 0;

        for (let i = 0; i < valid.length; i++) {
            const move = valid[i].tickMove;

            if (move > 0) {
                if (currentDirection === 1) {
                    currentStreak++;
                } else {
                    if (currentDirection === -1 && currentStreak > 0) {
                        downStreaks.push(currentStreak);
                    }
                    currentStreak = 1;
                    currentDirection = 1;
                }
                consecutiveUp++;
                if (consecutiveUp >= 2) twoUpCount++;
                consecutiveDown = 0;
            } else if (move < 0) {
                if (currentDirection === -1) {
                    currentStreak++;
                } else {
                    if (currentDirection === 1 && currentStreak > 0) {
                        upStreaks.push(currentStreak);
                    }
                    currentStreak = 1;
                    currentDirection = -1;
                }
                consecutiveDown++;
                if (consecutiveDown >= 2) twoDownCount++;
                consecutiveUp = 0;
            } else {
                // Zero move breaks streak
                if (currentDirection === 1 && currentStreak > 0) upStreaks.push(currentStreak);
                if (currentDirection === -1 && currentStreak > 0) downStreaks.push(currentStreak);
                currentStreak = 0;
                currentDirection = 0;
                consecutiveUp = 0;
                consecutiveDown = 0;
            }
        }

        // Push final streak
        if (currentDirection === 1 && currentStreak > 0) upStreaks.push(currentStreak);
        if (currentDirection === -1 && currentStreak > 0) downStreaks.push(currentStreak);

        const n = valid.length;
        const results = {
            upStreaks: {
                count: upStreaks.length,
                avgLength: upStreaks.length > 0 ? jStat.mean(upStreaks) : 0,
                maxLength: upStreaks.length > 0 ? Math.max(...upStreaks) : 0,
                probTwoPlus: twoUpCount / n,
                probTwoPlusCI: wilsonCI(twoUpCount, n),
            },
            downStreaks: {
                count: downStreaks.length,
                avgLength: downStreaks.length > 0 ? jStat.mean(downStreaks) : 0,
                maxLength: downStreaks.length > 0 ? Math.max(...downStreaks) : 0,
                probTwoPlus: twoDownCount / n,
                probTwoPlusCI: wilsonCI(twoDownCount, n),
            },
        };

        this.results.streaks = results;
        return results;
    }

    /**
     * Calculate range probabilities
     * P(stay within ±n ticks) and P(breakout)
     * OPTIMIZED: Single pass for all tick levels
     */
    calculateRangeProbabilities() {
        const valid = this.dfValid;
        if (valid.length === 0) return {};

        const tickLevels = this.config.tickLevels;
        const n = valid.length;

        // Initialize counters
        const counts = {};
        tickLevels.forEach(t => { counts[t] = { within: 0, breakout: 0 }; });

        // Single pass
        for (const r of valid) {
            for (const nticks of tickLevels) {
                if (r.absTickMove < nticks) counts[nticks].within++;
                else counts[nticks].breakout++;
            }
        }

        const results = {};
        tickLevels.forEach(nticks => {
            const c = counts[nticks];
            results[nticks] = {
                probWithin: c.within / n,
                probWithinCI: wilsonCI(c.within, n),
                probBreakout: c.breakout / n,
                probBreakoutCI: wilsonCI(c.breakout, n),
            };
        });

        this.results.rangeProbs = results;
        return results;
    }

    /**
     * Calculate expected value metrics
     */
    calculateExpectedValue() {
        const valid = this.dfValid;
        if (valid.length === 0) return {};

        const tickMoves = valid.map(r => r.tickMove);
        const absMoves = valid.map(r => r.absTickMove);

        // Separate gains and losses
        const gains = tickMoves.filter(t => t > 0);
        const losses = tickMoves.filter(t => t < 0);

        const avgGain = gains.length > 0 ? jStat.mean(gains) : 0;
        const avgLoss = losses.length > 0 ? Math.abs(jStat.mean(losses)) : 0;

        // Win rate (UP moves as "wins")
        const winRate = gains.length / valid.length;

        // Profit factor
        const totalGains = gains.reduce((a, b) => a + b, 0);
        const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
        const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;

        // Expected value
        const expectedTick = jStat.mean(tickMoves);
        const expectedAbs = jStat.mean(absMoves);

        // Risk/Reward ratio
        const riskReward = avgLoss > 0 ? avgGain / avgLoss : avgGain > 0 ? Infinity : 0;

        const results = {
            expectedTick,
            expectedTickCI: [expectedTick - 1.96 * jStat.stdev(tickMoves, true) / Math.sqrt(valid.length),
            expectedTick + 1.96 * jStat.stdev(tickMoves, true) / Math.sqrt(valid.length)],
            expectedAbs,
            avgGain,
            avgLoss,
            winRate,
            winRateCI: wilsonCI(gains.length, valid.length),
            profitFactor,
            riskReward,
            totalGains,
            totalLosses,
        };

        this.results.expectedValue = results;
        return results;
    }

    /**
     * Calculate weekday-specific probabilities
     */
    calculateWeekdayProbs() {
        const valid = this.dfValid;
        if (valid.length === 0) return {};

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const byDay = {};
        dayNames.forEach((name, i) => {
            byDay[i] = { name, moves: [], up: 0, down: 0, unchanged: 0, total: 0 };
        });

        valid.forEach(r => {
            const day = r.datetime.getDay();
            byDay[day].moves.push(r.tickMove);
            byDay[day].total++;
            if (r.tickMove > 0) byDay[day].up++;
            else if (r.tickMove < 0) byDay[day].down++;
            else byDay[day].unchanged++;
        });

        const results = {};
        Object.entries(byDay).forEach(([day, data]) => {
            if (data.total >= 5) { // Min 5 samples per day
                results[data.name] = {
                    n: data.total,
                    probUp: data.up / data.total,
                    probUpCI: wilsonCI(data.up, data.total),
                    probDown: data.down / data.total,
                    probDownCI: wilsonCI(data.down, data.total),
                    avgMove: data.moves.length > 0 ? jStat.mean(data.moves) : 0,
                    volatility: data.moves.length > 1 ? jStat.stdev(data.moves, true) : 0,
                };
            }
        });

        this.results.weekday = results;
        return results;
    }

    /**
     * Calculate recent vs historical comparison
     */
    calculateRecentComparison() {
        const valid = this.dfValid;
        if (valid.length < 60) return {};

        // Last 30 days vs all-time
        const recent = valid.slice(-30);
        const historical = valid.slice(0, -30);

        const recentUp = recent.filter(r => r.tickMove > 0).length;
        const historicalUp = historical.filter(r => r.tickMove > 0).length;

        const results = {
            recent: {
                n: recent.length,
                probUp: recentUp / recent.length,
                probUpCI: wilsonCI(recentUp, recent.length),
                avgMove: jStat.mean(recent.map(r => r.tickMove)),
                volatility: jStat.stdev(recent.map(r => r.tickMove), true),
            },
            historical: {
                n: historical.length,
                probUp: historicalUp / historical.length,
                probUpCI: wilsonCI(historicalUp, historical.length),
                avgMove: jStat.mean(historical.map(r => r.tickMove)),
                volatility: jStat.stdev(historical.map(r => r.tickMove), true),
            },
            regimeChange: Math.abs(recentUp / recent.length - historicalUp / historical.length) > 0.1,
        };

        this.results.recentComparison = results;
        return results;
    }

    /**
     * Get tick distribution for histogram
     */
    getTickDistribution() {
        const valid = this.dfValid;
        const counts = {};

        valid.forEach(r => {
            const tick = r.tickMove;
            counts[tick] = (counts[tick] || 0) + 1;
        });

        const entries = Object.entries(counts)
            .map(([k, v]) => ({
                tick: parseInt(k),
                count: v,
                pct: (v / valid.length) * 100,
            }))
            .sort((a, b) => a.tick - b.tick);

        return entries;
    }
}
