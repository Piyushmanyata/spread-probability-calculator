export default function ProbabilityCards({ empiricalRaw, empiricalFiltered, volWeighted, bootstrap, config }) {
    if (!empiricalFiltered?.probs) return null;

    const tickLevels = config?.tickLevels || [1, 2, 3];
    const tickSize = config?.tickSize || 0.005;

    const ProbabilityGauge = ({ value, ci, label, colorClass }) => (
        <div className="mb-3">
            <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={`font-mono font-semibold ${colorClass}`}>
                    {(value * 100).toFixed(1)}%
                </span>
            </div>
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`absolute h-full rounded-full transition-all duration-500 ${colorClass.includes('green') ? 'bg-green-500' :
                            colorClass.includes('red') ? 'bg-red-500' :
                                'bg-primary-500'
                        }`}
                    style={{ width: `${value * 100}%` }}
                />
                {ci && (
                    <>
                        <div
                            className="absolute h-full w-0.5 bg-white/30"
                            style={{ left: `${ci[0] * 100}%` }}
                        />
                        <div
                            className="absolute h-full w-0.5 bg-white/30"
                            style={{ left: `${ci[1] * 100}%` }}
                        />
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Tick Probabilities
            </h3>

            <div className="grid gap-4">
                {tickLevels.map(n => {
                    const raw = empiricalRaw?.probs?.[n] || {};
                    const filtered = empiricalFiltered?.probs?.[n] || {};
                    const vol = volWeighted?.[n] || {};
                    const boot = bootstrap?.[n] || {};

                    return (
                        <div key={n} className="glass-card p-5 glass-card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold">
                                    <span className="text-primary-400">±{n}</span> Tick
                                    <span className="text-gray-500 text-sm ml-2">
                                        (±{(n * tickSize).toFixed(3)})
                                    </span>
                                </h4>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono gradient-text">
                                        {(filtered.probAtLeast * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-gray-500">P(≥{n} tick)</div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                                        Normal Regime (n={empiricalFiltered.n})
                                    </p>
                                    <ProbabilityGauge
                                        value={filtered.probUpAtLeast || 0}
                                        ci={filtered.probUpCI}
                                        label={`P(UP ≥${n})`}
                                        colorClass="text-green-400"
                                    />
                                    <ProbabilityGauge
                                        value={filtered.probDownAtLeast || 0}
                                        ci={filtered.probDownCI}
                                        label={`P(DOWN ≤-${n})`}
                                        colorClass="text-red-400"
                                    />
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                                        Real World (n={empiricalRaw?.n || 0})
                                    </p>
                                    <ProbabilityGauge
                                        value={raw.probUpAtLeast || 0}
                                        label={`P(UP ≥${n})`}
                                        colorClass="text-green-400"
                                    />
                                    <ProbabilityGauge
                                        value={raw.probDownAtLeast || 0}
                                        label={`P(DOWN ≤-${n})`}
                                        colorClass="text-red-400"
                                    />
                                </div>
                            </div>

                            {vol.volWeightedAtLeast !== undefined && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Volume-Weighted P(≥{n})</span>
                                        <span className="font-mono text-primary-400">
                                            {(vol.volWeightedAtLeast * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {boot.abs && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Bootstrap 95% CI: [{(boot.abs.ci[0] * 100).toFixed(1)}%, {(boot.abs.ci[1] * 100).toFixed(1)}%]
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
