import { memo, useState } from 'react';

/**
 * StatsPanel - Simplified statistical analysis with plain English explanations
 * Shows key insights upfront with technical details hidden by default
 */
function StatsPanel({ data, spreadStats }) {
    const [showDetails, setShowDetails] = useState(false);

    if (!data) return null;

    const { distribution, autocorrelation, ttest, runsTest } = data;

    // Generate simple insights from the data
    const getInsights = () => {
        const insights = [];

        // Check for directional bias
        if (ttest?.hasBias) {
            insights.push({
                icon: '⚠️',
                title: 'Directional Bias Detected',
                detail: `This spread tends to move ${distribution?.meanDir > 0 ? 'UP' : 'DOWN'} on average`,
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-500/10',
            });
        } else {
            insights.push({
                icon: '✓',
                title: 'No Consistent Direction',
                detail: 'Up and down moves are roughly balanced over time',
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
            });
        }

        // Check randomness
        if (runsTest && !runsTest.note) {
            if (runsTest.isRandom) {
                insights.push({
                    icon: '🎲',
                    title: 'Random Walk Pattern',
                    detail: "Each day's move appears independent of previous days",
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                });
            } else {
                insights.push({
                    icon: '📈',
                    title: 'Pattern Detected',
                    detail: "Past moves may help predict future moves",
                    color: 'text-purple-400',
                    bgColor: 'bg-purple-500/10',
                });
            }
        }

        // Check autocorrelation
        if (autocorrelation?.lag_1 && Math.abs(autocorrelation.lag_1) > 0.1) {
            const direction = autocorrelation.lag_1 > 0 ? 'trend' : 'mean-revert';
            insights.push({
                icon: autocorrelation.lag_1 > 0 ? '📊' : '↔️',
                title: autocorrelation.lag_1 > 0 ? 'Tends to Trend' : 'Tends to Mean-Revert',
                detail: autocorrelation.lag_1 > 0
                    ? 'Up days tend to follow up days, down follows down'
                    : 'Big moves tend to reverse the next day',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10',
            });
        }

        return insights;
    };

    const insights = getInsights();

    const formatNum = (v, d = 2) =>
        v !== undefined && v !== null && !isNaN(v) && isFinite(v) ? v.toFixed(d) : '-';

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Key Statistical Findings
            </h3>

            {/* Simple Insights Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {insights.map((insight, idx) => (
                    <div key={idx} className={`p-4 rounded-lg ${insight.bgColor} border border-gray-700`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{insight.icon}</span>
                            <div>
                                <p className={`font-medium ${insight.color}`}>{insight.title}</p>
                                <p className="text-sm text-gray-400 mt-1">{insight.detail}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats Summary */}
            {spreadStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="text-center p-3 rounded-lg bg-gray-800/50">
                        <p className="text-xs text-gray-500 mb-1">Average Spread</p>
                        <p className="font-mono text-lg text-primary-400">{spreadStats.mean?.toFixed(4) || '-'}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/50">
                        <p className="text-xs text-gray-500 mb-1">Volatility</p>
                        <p className="font-mono text-lg text-white">{spreadStats.std?.toFixed(4) || '-'}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/50">
                        <p className="text-xs text-gray-500 mb-1">Lowest Seen</p>
                        <p className="font-mono text-lg text-red-400">{spreadStats.min?.toFixed(4) || '-'}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/50">
                        <p className="text-xs text-gray-500 mb-1">Highest Seen</p>
                        <p className="font-mono text-lg text-green-400">{spreadStats.max?.toFixed(4) || '-'}</p>
                    </div>
                </div>
            )}

            {/* Distribution Summary */}
            {distribution && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 rounded-lg bg-gray-800/30">
                        <p className="text-xs text-gray-500 mb-1">Avg Move Size</p>
                        <p className="font-mono text-white">{formatNum(distribution.meanAbs, 2)} ticks</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/30">
                        <p className="text-xs text-gray-500 mb-1">Avg Direction</p>
                        <p className={`font-mono ${distribution.meanDir >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {distribution.meanDir >= 0 ? '+' : ''}{formatNum(distribution.meanDir, 3)}
                        </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/30">
                        <p className="text-xs text-gray-500 mb-1">Lean</p>
                        <p className={`font-mono ${distribution.skewness > 0.5 ? 'text-green-400' :
                                distribution.skewness < -0.5 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                            {distribution.skewness > 0.5 ? 'Right ↗' :
                                distribution.skewness < -0.5 ? 'Left ↙' : 'Balanced ↔'}
                        </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-800/30">
                        <p className="text-xs text-gray-500 mb-1">Tail Size</p>
                        <p className={`font-mono ${distribution.kurtosis > 1 ? 'text-orange-400' : 'text-green-400'}`}>
                            {distribution.kurtosis > 1 ? 'Fat Tails' : 'Normal'}
                        </p>
                    </div>
                </div>
            )}

            {/* Expandable Technical Details */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 flex items-center justify-center gap-2 transition-colors"
            >
                <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
                <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDetails && (
                <div className="mt-4 space-y-4">
                    {/* Autocorrelation */}
                    {autocorrelation && (
                        <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                            <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Autocorrelation (Day-to-Day Relationship)</h4>
                            <div className="grid grid-cols-4 gap-3">
                                {Object.entries(autocorrelation).map(([key, value]) => {
                                    const lag = key.replace('lag_', '');
                                    const strength = Math.abs(value || 0);
                                    const color = strength > 0.3 ? 'text-red-400' :
                                        strength > 0.2 ? 'text-yellow-400' :
                                            strength > 0.1 ? 'text-orange-400' : 'text-gray-400';
                                    return (
                                        <div key={key} className="text-center p-2 rounded bg-gray-800/50">
                                            <p className="text-xs text-gray-500">Lag {lag}</p>
                                            <p className={`font-mono ${color}`}>
                                                {value !== null ? (value >= 0 ? '+' : '') + value.toFixed(3) : 'N/A'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                                Values near 0 = random. Positive = trending. Negative = mean-reverting.
                            </p>
                        </div>
                    )}

                    {/* Statistical Tests */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* T-Test */}
                        {ttest && (
                            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                                <h5 className="text-sm font-medium mb-2">T-Test (Is average move ≠ 0?)</h5>
                                <p className="text-gray-400 text-sm">t-stat: <span className="font-mono text-white">{formatNum(ttest.tStat, 3)}</span></p>
                                <p className="text-gray-400 text-sm">p-value: <span className="font-mono text-white">{formatNum(ttest.pValue, 4)}</span></p>
                                <p className={`text-sm mt-2 font-medium ${ttest.hasBias ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {ttest.hasBias ? '⚠️ Significant bias found' : '✓ No significant bias'}
                                </p>
                            </div>
                        )}

                        {/* Runs Test */}
                        {runsTest && (
                            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                                <h5 className="text-sm font-medium mb-2">Runs Test (Is it random?)</h5>
                                {runsTest.note ? (
                                    <p className="text-gray-500 text-sm">{runsTest.note}</p>
                                ) : (
                                    <>
                                        <p className="text-gray-400 text-sm">z-stat: <span className="font-mono text-white">{formatNum(runsTest.zStat, 3)}</span></p>
                                        <p className={`text-sm mt-2 font-medium ${runsTest.isRandom ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {runsTest.isRandom ? '✓ Appears random' : '⚠️ Non-random pattern detected'}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(StatsPanel);


