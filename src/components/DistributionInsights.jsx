import { memo } from 'react';

function DistributionInsights({ normalityTests, volatilityClustering, distributionRegime }) {
    // If no data at all, don't render
    if (!normalityTests && !volatilityClustering && !distributionRegime) {
        return null;
    }

    const formatNum = (v, d = 2) =>
        v !== undefined && v !== null && !isNaN(v) && isFinite(v) ? v.toFixed(d) : '-';

    const getRegimeBadgeColor = (regime) => {
        switch (regime) {
            case 'EXTREME_KURTOSIS':
            case 'FAT_TAILED_CLUSTERED':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'FAT_TAILED':
            case 'CLUSTERED_VOL':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'NORMAL':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            default:
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    const getRiskScoreColor = (score) => {
        if (score >= 70) return 'text-red-400';
        if (score >= 50) return 'text-orange-400';
        if (score >= 30) return 'text-yellow-400';
        return 'text-green-400';
    };

    const StatCard = ({ title, children }) => (
        <div className="p-4 rounded-lg bg-gray-800/50">
            <h5 className="text-sm uppercase tracking-wider text-gray-500 mb-3">{title}</h5>
            {children}
        </div>
    );

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Distribution Insights
                {distributionRegime && (
                    <span className={`ml-auto px-3 py-1 text-sm rounded-full border ${getRegimeBadgeColor(distributionRegime.regime)}`}>
                        {distributionRegime.regime?.replace(/_/g, ' ')}
                    </span>
                )}
            </h3>

            {/* Risk Score Bar */}
            {distributionRegime && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Statistical Risk Score</span>
                        <span className={`font-mono text-lg font-bold ${getRiskScoreColor(distributionRegime.riskScore)}`}>
                            {distributionRegime.riskScore}/100
                        </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${distributionRegime.riskScore >= 70 ? 'bg-red-500' :
                                    distributionRegime.riskScore >= 50 ? 'bg-orange-500' :
                                        distributionRegime.riskScore >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${distributionRegime.riskScore}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Normality Test */}
                {normalityTests && !normalityTests.isFlatline && (
                    <StatCard title="Normality Test (Jarque-Bera)">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">JB Statistic</span>
                                <span className="font-mono">{formatNum(normalityTests.jarqueBeraStat, 2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">p-value</span>
                                <span className={`font-mono ${normalityTests.jarqueBeraPValue < 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                                    {formatNum(normalityTests.jarqueBeraPValue, 4)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-gray-700">
                                <span className={`text-sm font-medium ${normalityTests.isNormal ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {normalityTests.isNormal ? '✓ Normal (cannot reject H₀)' : '⚠️ Non-Normal (reject H₀)'}
                                </span>
                            </div>
                        </div>
                    </StatCard>
                )}

                {/* Distribution Shape */}
                {normalityTests && !normalityTests.isFlatline && (
                    <StatCard title="Distribution Shape">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Type</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${normalityTests.distributionType.includes('LEPTOKURTIC') ? 'bg-orange-500/20 text-orange-400' :
                                        normalityTests.distributionType === 'PLATYKURTIC' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-green-500/20 text-green-400'
                                    }`}>
                                    {normalityTests.distributionType?.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Skewness</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${normalityTests.skewType === 'LEFT_SKEWED' ? 'bg-red-500/20 text-red-400' :
                                        normalityTests.skewType === 'RIGHT_SKEWED' ? 'bg-green-500/20 text-green-400' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {normalityTests.skewType?.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Max Observed</span>
                                <span className="font-mono">{formatNum(normalityTests.observedMaxSigma, 1)}σ</span>
                            </div>
                        </div>
                    </StatCard>
                )}

                {/* Volatility Clustering */}
                {volatilityClustering && Object.keys(volatilityClustering).length > 0 && (
                    <StatCard title="Volatility Clustering">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">ARCH Effects</span>
                                <span className={`font-medium ${volatilityClustering.hasARCHEffects ? 'text-orange-400' : 'text-green-400'}`}>
                                    {volatilityClustering.hasARCHEffects ? 'Detected' : 'Not Detected'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Clustering</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${volatilityClustering.clusteringStrength === 'STRONG' ? 'bg-red-500/20 text-red-400' :
                                        volatilityClustering.clusteringStrength === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                    }`}>
                                    {volatilityClustering.clusteringStrength}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Vol Regime</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${volatilityClustering.volRegime === 'HIGH_VOL' ? 'bg-red-500/20 text-red-400' :
                                        volatilityClustering.volRegime === 'LOW_VOL' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {volatilityClustering.volRegime?.replace('_', ' ')}
                                </span>
                            </div>
                            {volatilityClustering.hasLeverageEffect && (
                                <div className="pt-1">
                                    <span className="text-xs text-orange-400">⚡ Leverage effect present</span>
                                </div>
                            )}
                        </div>
                    </StatCard>
                )}
            </div>

            {/* Warnings */}
            {distributionRegime?.warnings?.length > 0 && (
                <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">⚠️ Risk Warnings</h5>
                    <ul className="space-y-1">
                        {distributionRegime.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm text-yellow-400/80 flex items-start gap-2">
                                <span className="text-yellow-500 mt-1">•</span>
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Model Recommendation */}
            {distributionRegime?.modelRecommendation && distributionRegime.modelRecommendation !== 'Standard analysis appropriate' && (
                <div className="mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                    <p className="text-sm text-primary-400 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Recommendation:</strong> {distributionRegime.modelRecommendation}</span>
                    </p>
                </div>
            )}
        </div>
    );
}

export default memo(DistributionInsights);
