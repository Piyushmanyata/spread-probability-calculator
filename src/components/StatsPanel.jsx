export default function StatsPanel({ data, spreadStats }) {
    if (!data) return null;

    const { distribution, autocorrelation, ttest, runsTest } = data;

    const StatBox = ({ label, value, subtext, colorClass = 'text-white' }) => (
        <div className="p-3 rounded-lg bg-gray-800/50">
            <span className="text-xs text-gray-500 uppercase">{label}</span>
            <p className={`font-mono font-semibold text-lg ${colorClass}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
    );

    const getAutocorrSignificance = (v) => {
        if (v === null) return { stars: '', color: 'text-gray-500' };
        const abs = Math.abs(v);
        if (abs > 0.3) return { stars: '***', color: 'text-red-400' };
        if (abs > 0.2) return { stars: '**', color: 'text-yellow-400' };
        if (abs > 0.1) return { stars: '*', color: 'text-orange-400' };
        return { stars: '', color: 'text-gray-400' };
    };

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Statistical Analysis
            </h3>

            {/* Spread Stats */}
            {spreadStats && (
                <div className="mb-6">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Spread Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox
                            label="Mean"
                            value={spreadStats.mean?.toFixed(4) || '-'}
                            colorClass="text-primary-400"
                        />
                        <StatBox
                            label="Std Dev"
                            value={spreadStats.std?.toFixed(4) || '-'}
                        />
                        <StatBox
                            label="Min"
                            value={spreadStats.min?.toFixed(4) || '-'}
                            colorClass="text-red-400"
                        />
                        <StatBox
                            label="Max"
                            value={spreadStats.max?.toFixed(4) || '-'}
                            colorClass="text-green-400"
                        />
                    </div>
                </div>
            )}

            {/* Distribution */}
            {distribution && (
                <div className="mb-6">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Distribution</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox
                            label="Mean (Abs)"
                            value={distribution.meanAbs?.toFixed(3) || '-'}
                        />
                        <StatBox
                            label="Std (Dir)"
                            value={distribution.stdDir?.toFixed(3) || '-'}
                        />
                        <StatBox
                            label="Skewness"
                            value={distribution.skewness?.toFixed(3) || '-'}
                            subtext={distribution.skewness > 0.5 ? 'Right-skewed' : distribution.skewness < -0.5 ? 'Left-skewed' : 'Symmetric'}
                        />
                        <StatBox
                            label="Kurtosis"
                            value={distribution.kurtosis?.toFixed(3) || '-'}
                            subtext={distribution.kurtosis > 1 ? 'Fat tails' : 'Normal tails'}
                        />
                    </div>
                </div>
            )}

            {/* Autocorrelation */}
            {autocorrelation && (
                <div className="mb-6">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Autocorrelation</h4>
                    <div className="grid grid-cols-4 gap-3">
                        {Object.entries(autocorrelation).map(([key, value]) => {
                            const sig = getAutocorrSignificance(value);
                            const lag = key.replace('lag_', '');
                            return (
                                <div key={key} className="p-3 rounded-lg bg-gray-800/50 text-center">
                                    <span className="text-xs text-gray-500">Lag {lag}</span>
                                    <p className={`font-mono font-semibold ${sig.color}`}>
                                        {value !== null ? (value >= 0 ? '+' : '') + value.toFixed(4) : 'N/A'}
                                        <span className="text-yellow-400 ml-1">{sig.stars}</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Strength: * |r|&gt;0.1 | ** |r|&gt;0.2 | *** |r|&gt;0.3
                    </p>
                </div>
            )}

            {/* Statistical Tests */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* T-Test */}
                {ttest && (
                    <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                        <h5 className="font-medium mb-2">T-Test (Mean ≠ 0)</h5>
                        <div className="flex justify-between">
                            <span className="text-gray-400">t-stat</span>
                            <span className="font-mono">{ttest.tStat?.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">p-value</span>
                            <span className="font-mono">{ttest.pValue?.toFixed(4)}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-700">
                            <span className={`text-sm font-medium ${ttest.hasBias ? 'text-yellow-400' : 'text-green-400'}`}>
                                {ttest.hasBias ? '⚠️ Significant Bias Detected' : '✓ No Significant Bias'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Runs Test */}
                {runsTest && (
                    <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                        <h5 className="font-medium mb-2">Runs Test (Randomness)</h5>
                        {runsTest.note ? (
                            <p className="text-gray-500 text-sm">{runsTest.note}</p>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">z-stat</span>
                                    <span className="font-mono">{runsTest.zStat?.toFixed(3)}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                    <span className={`text-sm font-medium ${runsTest.isRandom ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {runsTest.isRandom ? '✓ Random (IID)' : '⚠️ Non-Random Pattern'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
