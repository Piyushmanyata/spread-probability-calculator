import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import RiskMeter from './RiskMeter';

/**
 * SimpleSummary - Hero component with visual-first, plain English statistics
 * Designed for users who want quick insights without technical jargon
 */
function SimpleSummary({ predictions, distributionRegime, tailRisk, config }) {
    if (!predictions) return null;

    const { tomorrowMove, expectedRange, tradingRecommendation, plainEnglishSummary } = predictions;
    const tickSize = config?.tickSize || 0.005;

    // Prepare pie chart data with NaN guards
    const pieData = tomorrowMove ? [
        { name: 'Up', value: Math.round((tomorrowMove.probUp || 0) * 100), color: '#22c55e' },
        { name: 'Flat', value: Math.round((tomorrowMove.probFlat || 0) * 100), color: '#6b7280' },
        { name: 'Down', value: Math.round((tomorrowMove.probDown || 0) * 100), color: '#ef4444' },
    ].filter(d => d.value > 0) : [];

    // Determine the likely direction
    const getLikelyDirection = () => {
        if (!tomorrowMove) return { text: 'Unknown', icon: '❓', color: 'text-gray-400' };
        const diff = tomorrowMove.probUp - tomorrowMove.probDown;
        if (diff > 0.1) return { text: 'Likely UP', icon: '📈', color: 'text-green-400' };
        if (diff < -0.1) return { text: 'Likely DOWN', icon: '📉', color: 'text-red-400' };
        return { text: 'Coin Flip', icon: '🎲', color: 'text-yellow-400' };
    };

    const direction = getLikelyDirection();
    const riskScore = distributionRegime?.riskScore || 30;

    // Plain English interpretations
    const getSimpleRiskExplanation = () => {
        if (riskScore >= 70) return "⚠️ High risk - expect bigger swings than usual";
        if (riskScore >= 40) return "📊 Moderate risk - typical market conditions";
        return "✅ Low risk - calm market expected";
    };

    const getExpectedMoveExplanation = () => {
        const avgMove = expectedRange?.mostLikely || 1;
        const priceMove = (avgMove * tickSize).toFixed(3);
        return `Most days, prices move about ${avgMove} tick${avgMove !== 1 ? 's' : ''} (${priceMove})`;
    };

    // Get action recommendation in simple terms
    const getSimpleRecommendation = () => {
        const action = tradingRecommendation?.action || '';
        if (action.includes('LONG')) return { text: 'Favor buying', icon: '🟢', detail: 'Statistics lean bullish' };
        if (action.includes('SHORT')) return { text: 'Favor selling', icon: '🔴', detail: 'Statistics lean bearish' };
        if (action.includes('REDUCE')) return { text: 'Be cautious', icon: '⚠️', detail: 'High risk environment' };
        if (action.includes('RANGE')) return { text: 'Range trade', icon: '↔️', detail: 'Low volatility - trade the range' };
        return { text: 'No clear edge', icon: '⚖️', detail: 'Wait for better setup' };
    };

    const recommendation = getSimpleRecommendation();

    const CustomLegend = ({ payload }) => (
        <div className="flex justify-center gap-4 mt-2">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-400">{entry.value}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="glass-card p-6 md:p-8 mb-6">
            {/* Main Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
                    What to Expect Tomorrow
                </h2>
                <p className="text-gray-400">Simple insights from your data</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">

                {/* Direction Prediction - Pie Chart */}
                <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">Direction</h3>

                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend content={<CustomLegend />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={`mt-2 text-xl font-bold ${direction.color}`}>
                        {direction.icon} {direction.text}
                    </div>
                </div>

                {/* Risk Level - Meter */}
                <div className="bg-gray-800/50 rounded-xl p-5 text-center">
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">Risk Level</h3>
                    <RiskMeter value={riskScore} size={160} />
                    <p className="text-sm text-gray-400 mt-3">{getSimpleRiskExplanation()}</p>
                </div>

                {/* Action Recommendation */}
                <div className="bg-gray-800/50 rounded-xl p-5 text-center flex flex-col justify-center">
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">Suggestion</h3>

                    <div className="text-5xl mb-3">{recommendation.icon}</div>
                    <div className="text-xl font-bold text-white mb-2">{recommendation.text}</div>
                    <p className="text-sm text-gray-400">{recommendation.detail}</p>

                    {/* Expected move */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-500">{getExpectedMoveExplanation()}</p>
                    </div>
                </div>
            </div>

            {/* Quick Summary Bullets */}
            {plainEnglishSummary?.length > 0 && (
                <div className="bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-xl p-5 border border-primary-500/20">
                    <h3 className="text-sm uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-2">
                        <span>💡</span> Key Takeaways
                    </h3>
                    <ul className="space-y-2">
                        {plainEnglishSummary.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-200">
                                <span className="text-primary-400 mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Simple Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <SimpleStatBox
                    label="Chance of going UP"
                    value={`${Math.round((tomorrowMove?.probUp || 0) * 100)}%`}
                    color="text-green-400"
                />
                <SimpleStatBox
                    label="Chance of going DOWN"
                    value={`${Math.round((tomorrowMove?.probDown || 0) * 100)}%`}
                    color="text-red-400"
                />
                <SimpleStatBox
                    label="Typical daily move"
                    value={`±${expectedRange?.mostLikely || 1} ticks`}
                    color="text-primary-400"
                />
                <SimpleStatBox
                    label="Worst expected day"
                    value={`-${tailRisk?.historicalVaR95?.toFixed(1) || '?'} ticks`}
                    color="text-yellow-400"
                />
            </div>
        </div>
    );
}

// Simple stat box sub-component
function SimpleStatBox({ label, value, color = 'text-white' }) {
    return (
        <div className="bg-gray-800/30 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`font-mono font-bold text-lg ${color}`}>{value}</p>
        </div>
    );
}

export default memo(SimpleSummary);
