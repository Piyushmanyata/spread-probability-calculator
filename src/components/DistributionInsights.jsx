import { memo, useState } from 'react';

function DistributionInsights({ normalityTests, volatilityClustering, distributionRegime }) {
    const [showDetails, setShowDetails] = useState(false);

    // If no data at all, don't render
    if (!normalityTests && !volatilityClustering && !distributionRegime) {
        return null;
    }

    const formatNum = (v, d = 2) =>
        v !== undefined && v !== null && !isNaN(v) && isFinite(v) ? v.toFixed(d) : '-';

    // Simple explanations for complex stats
    const getSimpleExplanations = () => {
        const explanations = [];

        // Is the data "normal"?
        if (normalityTests && !normalityTests.isFlatline) {
            if (!normalityTests.isNormal) {
                explanations.push({
                    icon: '⚠️',
                    title: 'Expect Surprises',
                    detail: "Prices don't follow typical patterns - unusual moves happen more often",
                    color: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                });
            } else {
                explanations.push({
                    icon: '✓',
                    title: 'Normal Behavior',
                    detail: 'Price movements follow predictable patterns',
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                });
            }

            // Fat tails explanation
            if (normalityTests.excessKurtosis > 1) {
                explanations.push({
                    icon: '💥',
                    title: 'Big Moves Possible',
                    detail: 'Extreme price swings happen more often than you might think',
                    color: 'text-orange-400',
                    bgColor: 'bg-orange-500/10',
                });
            }

            // Skewness explanation
            if (normalityTests.skewType === 'LEFT_SKEWED') {
                explanations.push({
                    icon: '📉',
                    title: 'Drops Hit Harder',
                    detail: 'Big down moves are more common than big up moves',
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                });
            } else if (normalityTests.skewType === 'RIGHT_SKEWED') {
                explanations.push({
                    icon: '📈',
                    title: 'Upside Potential',
                    detail: 'Big up moves are more common than big down moves',
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                });
            }
        }

        // Volatility clustering
        if (volatilityClustering?.hasARCHEffects) {
            explanations.push({
                icon: '🌊',
                title: 'Volatility Comes in Waves',
                detail: 'Calm periods cluster together, as do turbulent ones',
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
            });
        }

        // Current volatility regime
        if (volatilityClustering?.volRegime === 'HIGH_VOL') {
            explanations.push({
                icon: '⚡',
                title: 'High Volatility Mode',
                detail: 'Market is currently more active than usual',
                color: 'text-red-400',
                bgColor: 'bg-red-500/10',
            });
        } else if (volatilityClustering?.volRegime === 'LOW_VOL') {
            explanations.push({
                icon: '😴',
                title: 'Low Volatility Mode',
                detail: 'Market is currently calm with small moves',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
            });
        }

        return explanations;
    };

    const explanations = getSimpleExplanations();
    const riskScore = distributionRegime?.riskScore || 0;

    const getRiskLabel = (score) => {
        if (score >= 70) return { text: 'High Risk', color: 'text-red-400', bg: 'bg-red-500' };
        if (score >= 40) return { text: 'Medium Risk', color: 'text-yellow-400', bg: 'bg-yellow-500' };
        return { text: 'Low Risk', color: 'text-green-400', bg: 'bg-green-500' };
    };

    const riskLabel = getRiskLabel(riskScore);

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                How This Data Behaves
                <span className={`ml-auto px-3 py-1 text-sm rounded-full ${riskLabel.color} bg-gray-800/50 border border-gray-700`}>
                    {riskLabel.text}
                </span>
            </h3>

            {/* Risk Score Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Overall Risk Level</span>
                    <span className={`font-mono text-lg font-bold ${riskLabel.color}`}>
                        {riskScore}/100
                    </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${riskLabel.bg}`}
                        style={{ width: `${riskScore}%` }}
                    />
                </div>
            </div>

            {/* Simple Explanations Grid */}
            <div className="grid md:grid-cols-2 gap-3 mb-4">
                {explanations.map((exp, idx) => (
                    <div key={idx} className={`p-4 rounded-lg ${exp.bgColor} border border-gray-700`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{exp.icon}</span>
                            <div>
                                <p className={`font-medium ${exp.color}`}>{exp.title}</p>
                                <p className="text-sm text-gray-400 mt-1">{exp.detail}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
                <div className="mt-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700 text-sm">
                    <div className="grid md:grid-cols-3 gap-4">
                        {normalityTests && !normalityTests.isFlatline && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-2">Normality Test</p>
                                <p className="text-gray-400">JB Stat: <span className="text-white font-mono">{formatNum(normalityTests.jarqueBeraStat)}</span></p>
                                <p className="text-gray-400">p-value: <span className={`font-mono ${normalityTests.jarqueBeraPValue < 0.05 ? 'text-red-400' : 'text-green-400'}`}>{formatNum(normalityTests.jarqueBeraPValue, 4)}</span></p>
                            </div>
                        )}
                        {normalityTests && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-2">Shape</p>
                                <p className="text-gray-400">Skewness: <span className="text-white font-mono">{formatNum(normalityTests.skewness)}</span></p>
                                <p className="text-gray-400">Kurtosis: <span className="text-white font-mono">{formatNum(normalityTests.excessKurtosis)}</span></p>
                            </div>
                        )}
                        {volatilityClustering && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-2">Volatility</p>
                                <p className="text-gray-400">ARCH Effects: <span className={volatilityClustering.hasARCHEffects ? 'text-orange-400' : 'text-green-400'}>{volatilityClustering.hasARCHEffects ? 'Yes' : 'No'}</span></p>
                                <p className="text-gray-400">Clustering: <span className="text-white">{volatilityClustering.clusteringStrength}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(DistributionInsights);

