import { memo } from 'react';

/**
 * PredictiveInsights Component
 * Displays actionable predictions in plain English with visual indicators
 */
function PredictiveInsights({ predictions }) {
    if (!predictions || Object.keys(predictions).length === 0) return null;

    const {
        tomorrowMove,
        expectedRange,
        tailRiskWarning,
        regimeAssessment,
        momentumSignal,
        priceTargets,
        tradingRecommendation,
        plainEnglishSummary
    } = predictions;

    const getDirectionColor = (probUp, probDown) => {
        if (probUp > probDown + 0.1) return 'text-green-400';
        if (probDown > probUp + 0.1) return 'text-red-400';
        return 'text-gray-400';
    };

    const getConfidenceBadge = (level) => {
        const colors = {
            HIGH: 'bg-green-500/20 text-green-400 border-green-500/30',
            MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            LOW: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        return colors[level] || colors.LOW;
    };

    const getMomentumIcon = (dir) => {
        if (dir === 'BULLISH') return '🐂';
        if (dir === 'BEARISH') return '🐻';
        return '↔️';
    };

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                What This Means (Predictions)
                {tradingRecommendation && (
                    <span className={`ml-auto px-3 py-1 text-xs rounded-full border ${getConfidenceBadge(tradingRecommendation.confidence)}`}>
                        {tradingRecommendation.confidence} CONFIDENCE
                    </span>
                )}
            </h3>

            {/* Plain English Summary - Hero Section */}
            {plainEnglishSummary?.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <h4 className="text-sm font-medium text-blue-400 mb-3">📌 Quick Summary</h4>
                    <ul className="space-y-2">
                        {plainEnglishSummary.map((item, idx) => (
                            <li key={idx} className="text-lg">{item}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tomorrow's Direction */}
                {tomorrowMove && (
                    <div className="p-4 rounded-lg bg-gray-800/50">
                        <h5 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Tomorrow's Direction</h5>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-400">
                                    {(tomorrowMove.probUp * 100).toFixed(0)}%
                                </p>
                                <p className="text-xs text-gray-500">UP</p>
                            </div>
                            <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-green-500 transition-all"
                                    style={{ width: `${tomorrowMove.probUp * 100}%` }}
                                />
                                <div
                                    className="bg-gray-500 transition-all"
                                    style={{ width: `${tomorrowMove.probFlat * 100}%` }}
                                />
                                <div
                                    className="bg-red-500 transition-all"
                                    style={{ width: `${tomorrowMove.probDown * 100}%` }}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-400">
                                    {(tomorrowMove.probDown * 100).toFixed(0)}%
                                </p>
                                <p className="text-xs text-gray-500">DOWN</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">{tomorrowMove.reasoning}</p>
                    </div>
                )}

                {/* Expected Range */}
                {expectedRange && (
                    <div className="p-4 rounded-lg bg-gray-800/50">
                        <h5 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Expected Move</h5>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Most Likely</span>
                                <span className="font-mono text-xl text-white">±{expectedRange.mostLikely}T</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">1σ Range</span>
                                <span className="font-mono text-yellow-400">±{expectedRange.oneStdDev}T</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">2σ Range</span>
                                <span className="font-mono text-red-400">±{expectedRange.twoStdDev}T</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Regime & Momentum */}
                {regimeAssessment && (
                    <div className="p-4 rounded-lg bg-gray-800/50">
                        <h5 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Market Regime</h5>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Volatility</span>
                                <span className={`px-2 py-1 rounded text-xs ${regimeAssessment.currentRegime === 'HIGH_VOL' ? 'bg-red-500/20 text-red-400' :
                                        regimeAssessment.currentRegime === 'LOW_VOL' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {regimeAssessment.currentRegime?.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Vol Trend</span>
                                <span className={`${regimeAssessment.volatilityTrend === 'RISING' ? 'text-red-400' :
                                        regimeAssessment.volatilityTrend === 'FALLING' ? 'text-green-400' : 'text-gray-400'
                                    }`}>
                                    {regimeAssessment.volatilityTrend === 'RISING' ? '📈' :
                                        regimeAssessment.volatilityTrend === 'FALLING' ? '📉' : '➡️'} {regimeAssessment.volatilityTrend}
                                </span>
                            </div>
                            {momentumSignal && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Momentum</span>
                                    <span className={`${momentumSignal.direction === 'BULLISH' ? 'text-green-400' :
                                            momentumSignal.direction === 'BEARISH' ? 'text-red-400' : 'text-gray-400'
                                        }`}>
                                        {getMomentumIcon(momentumSignal.direction)} {momentumSignal.direction}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Trading Recommendation */}
            {tradingRecommendation && (
                <div className={`mt-4 p-4 rounded-lg border ${tradingRecommendation.action.includes('LONG') ? 'bg-green-500/10 border-green-500/30' :
                        tradingRecommendation.action.includes('SHORT') ? 'bg-red-500/10 border-red-500/30' :
                            tradingRecommendation.action.includes('REDUCE') ? 'bg-orange-500/10 border-orange-500/30' :
                                'bg-gray-800/50 border-gray-700'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Trading Signal</p>
                            <p className={`text-lg font-semibold ${tradingRecommendation.action.includes('LONG') ? 'text-green-400' :
                                    tradingRecommendation.action.includes('SHORT') ? 'text-red-400' :
                                        tradingRecommendation.action.includes('REDUCE') ? 'text-orange-400' :
                                            'text-gray-300'
                                }`}>
                                {tradingRecommendation.action}
                            </p>
                        </div>
                        {priceTargets?.nextResistance && priceTargets?.nextSupport && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Key Levels</p>
                                <p className="text-sm">
                                    <span className="text-red-400">R: {priceTargets.nextResistance.toFixed(3)}</span>
                                    {' | '}
                                    <span className="text-green-400">S: {priceTargets.nextSupport.toFixed(3)}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tail Risk Warning */}
            {tailRiskWarning?.isActive && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">{tailRiskWarning.interpretation}</p>
                </div>
            )}

            {/* Educational Footer */}
            <p className="mt-4 text-xs text-gray-600">
                💡 These predictions are based on historical patterns and statistical analysis.
                Past performance does not guarantee future results. Use as one input among many.
            </p>
        </div>
    );
}

export default memo(PredictiveInsights);
