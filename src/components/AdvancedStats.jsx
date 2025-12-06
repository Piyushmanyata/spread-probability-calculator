import { memo } from 'react';

function AdvancedStats({ streaks, rangeProbs, expectedValue, weekday, recentComparison, config }) {
    const tickLevels = config?.tickLevels || [1, 2, 3];

    // If no data at all, don't render
    if (!expectedValue && !streaks && !rangeProbs && !weekday && !recentComparison) {
        return null;
    }

    const StatCard = ({ title, children }) => (
        <div className="p-4 rounded-lg bg-gray-800/50">
            <h5 className="text-sm uppercase tracking-wider text-gray-500 mb-3">{title}</h5>
            {children}
        </div>
    );

    const formatPct = (v) => (v !== undefined && v !== null && !isNaN(v)) ? `${(v * 100).toFixed(1)}%` : '-';
    const formatNum = (v, d = 2) => (v !== undefined && v !== null && !isNaN(v) && isFinite(v)) ? v.toFixed(d) : '-';

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Advanced Probabilities
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Expected Value */}
                {expectedValue && (
                    <StatCard title="Expected Value">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">E[tick]</span>
                                <span className={`font-mono ${expectedValue.expectedTick >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {expectedValue.expectedTick >= 0 ? '+' : ''}{formatNum(expectedValue.expectedTick, 3)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">E[|tick|]</span>
                                <span className="font-mono text-primary-400">{formatNum(expectedValue.expectedAbs, 3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Win Rate</span>
                                <span className="font-mono text-white">{formatPct(expectedValue.winRate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Profit Factor</span>
                                <span className={`font-mono ${expectedValue.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                    {expectedValue.profitFactor === Infinity ? '∞' : formatNum(expectedValue.profitFactor)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Risk/Reward</span>
                                <span className="font-mono text-white">
                                    {expectedValue.riskReward === Infinity ? '∞' : formatNum(expectedValue.riskReward)}
                                </span>
                            </div>
                        </div>
                    </StatCard>
                )}

                {/* Streak Analysis */}
                {streaks && (
                    <StatCard title="Streak Analysis">
                        <div className="space-y-3">
                            <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-400">UP Streaks</span>
                                    <span className="font-mono text-white">{formatPct(streaks.upStreaks?.probTwoPlus)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Avg: {formatNum(streaks.upStreaks?.avgLength)} | Max: {streaks.upStreaks?.maxLength || 0}
                                </div>
                            </div>
                            <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-400">DOWN Streaks</span>
                                    <span className="font-mono text-white">{formatPct(streaks.downStreaks?.probTwoPlus)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Avg: {formatNum(streaks.downStreaks?.avgLength)} | Max: {streaks.downStreaks?.maxLength || 0}
                                </div>
                            </div>
                        </div>
                    </StatCard>
                )}

                {/* Range Probabilities */}
                {rangeProbs && (
                    <StatCard title="Range Probabilities">
                        <div className="space-y-2 text-sm">
                            {tickLevels.map(n => {
                                const rp = rangeProbs[n];
                                if (!rp) return null;
                                return (
                                    <div key={n} className="flex justify-between items-center">
                                        <span className="text-gray-400">±{n} tick range</span>
                                        <div className="text-right">
                                            <span className="font-mono text-primary-400">{formatPct(rp.probWithin)}</span>
                                            <span className="text-gray-500 ml-2">stay</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </StatCard>
                )}

                {/* Recent vs Historical */}
                {recentComparison?.recent && (
                    <StatCard title="Recent vs Historical">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center p-2 rounded bg-primary-900/20">
                                <p className="text-xs text-gray-500 mb-1">Last 30 Days</p>
                                <p className="font-mono text-lg text-primary-400">{formatPct(recentComparison.recent.probUp)}</p>
                                <p className="text-xs text-gray-500">P(UP)</p>
                            </div>
                            <div className="text-center p-2 rounded bg-gray-700/30">
                                <p className="text-xs text-gray-500 mb-1">Historical</p>
                                <p className="font-mono text-lg text-white">{formatPct(recentComparison.historical.probUp)}</p>
                                <p className="text-xs text-gray-500">P(UP)</p>
                            </div>
                        </div>
                        {recentComparison.regimeChange && (
                            <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Significant regime change detected
                            </div>
                        )}
                    </StatCard>
                )}

                {/* Weekday Analysis */}
                {weekday && Object.keys(weekday).length > 0 && (
                    <div className="md:col-span-2">
                        <StatCard title="Weekday Analysis">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 border-b border-gray-700">
                                            <th className="text-left pb-2">Day</th>
                                            <th className="text-right pb-2">n</th>
                                            <th className="text-right pb-2">P(UP)</th>
                                            <th className="text-right pb-2">P(DOWN)</th>
                                            <th className="text-right pb-2">Avg Move</th>
                                            <th className="text-right pb-2">Volatility</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                                            const d = weekday[day];
                                            if (!d) return null;
                                            const isHighUp = d.probUp > 0.55;
                                            const isHighDown = d.probDown > 0.55;
                                            return (
                                                <tr key={day} className="border-b border-gray-800">
                                                    <td className="py-2">{day}</td>
                                                    <td className="text-right text-gray-500">{d.n}</td>
                                                    <td className={`text-right font-mono ${isHighUp ? 'text-green-400' : ''}`}>
                                                        {formatPct(d.probUp)}
                                                    </td>
                                                    <td className={`text-right font-mono ${isHighDown ? 'text-red-400' : ''}`}>
                                                        {formatPct(d.probDown)}
                                                    </td>
                                                    <td className={`text-right font-mono ${d.avgMove >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {d.avgMove >= 0 ? '+' : ''}{formatNum(d.avgMove, 3)}
                                                    </td>
                                                    <td className="text-right font-mono text-gray-400">
                                                        {formatNum(d.volatility, 3)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </StatCard>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(AdvancedStats);

