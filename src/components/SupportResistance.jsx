export default function SupportResistance({ data, tickSize = 0.005 }) {
    if (!data) return null;

    const { currentPrice, direction, resistance, support, nextTarget, lookbackDays } = data;

    const getStrengthColor = (strength) => {
        if (strength >= 7) return 'text-green-400';
        if (strength >= 4) return 'text-yellow-400';
        return 'text-gray-400';
    };

    const getStrengthBadge = (strength) => {
        if (strength >= 7) return { text: 'Strong', bg: 'bg-green-500/20 text-green-400 border-green-500/30' };
        if (strength >= 4) return { text: 'Moderate', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
        return { text: 'Weak', bg: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    };

    const getProximityAlert = (distTicks) => {
        if (distTicks <= 2) return { text: '⚠️ TESTING', class: 'text-yellow-400 animate-pulse' };
        if (distTicks <= 5) return { text: '→ Approaching', class: 'text-gray-400' };
        return null;
    };

    const LevelRow = ({ level, index, isResistance }) => {
        const badge = getStrengthBadge(level.strength);
        const proximity = getProximityAlert(level.distanceTicks);

        return (
            <div className={`p-4 rounded-lg ${isResistance ? 'sr-resistance' : 'sr-support'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold font-mono ${isResistance ? 'text-red-400' : 'text-green-400'}`}>
                            {isResistance ? 'R' : 'S'}{index + 1}
                        </span>
                        <span className="text-xl font-mono font-semibold text-white">
                            {level.price.toFixed(4)}
                        </span>
                        {proximity && (
                            <span className={`text-sm ${proximity.class}`}>
                                {proximity.text}
                            </span>
                        )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.bg}`}>
                        {badge.text}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Strength</span>
                        <p className={`font-mono font-semibold ${getStrengthColor(level.strength)}`}>
                            {level.strength.toFixed(1)}/10
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-500">Distance</span>
                        <p className="font-mono text-white">{level.distanceTicks}T</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Touches</span>
                        <p className="font-mono text-white">{level.touches}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Type</span>
                        <p className="text-primary-400 text-xs">{level.type}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Support & Resistance
                <span className="text-sm text-gray-500 font-normal ml-2">
                    (Last {lookbackDays} Days)
                </span>
            </h3>

            {/* Current Price & Direction */}
            <div className="glass-card p-4 mb-6 bg-gradient-to-r from-primary-900/20 to-accent-900/20 border-primary-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-gray-400 text-sm">Current Price</span>
                        <p className="text-2xl font-mono font-bold text-white">
                            {currentPrice?.toFixed(4)}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-400 text-sm">5-Day Trend</span>
                        <p className={`text-xl font-bold flex items-center gap-2 justify-end ${direction === 'UP' ? 'text-green-400' :
                            direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                            {direction === 'UP' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7 14l5-5 5 5H7z" />
                                </svg>
                            )}
                            {direction === 'DOWN' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7 10l5 5 5-5H7z" />
                                </svg>
                            )}
                            {direction}
                            {data.trendStrength !== undefined && direction !== 'FLAT' && (
                                <span className="text-sm font-normal text-gray-400">
                                    ({data.trendStrength}%)
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {nextTarget && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <span className="text-gray-400 text-sm">🎯 Target</span>
                        <p className="text-lg">
                            <span className={nextTarget.isResistance ? 'text-red-400' : 'text-green-400'}>
                                {nextTarget.type}
                            </span>
                            {' '}at{' '}
                            <span className="font-mono font-bold text-white">
                                {nextTarget.price.toFixed(4)}
                            </span>
                            {' '}
                            <span className="text-gray-500">
                                ({nextTarget.distanceTicks}T away, Str: {nextTarget.strength.toFixed(1)})
                            </span>
                        </p>
                    </div>
                )}
            </div>

            {/* Resistance Levels */}
            <div className="mb-6">
                <h4 className="text-sm uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Resistance (Above)
                </h4>
                <div className="space-y-2">
                    {resistance && resistance.length > 0 ? (
                        resistance.map((level, idx) => (
                            <LevelRow key={idx} level={level} index={idx} isResistance={true} />
                        ))
                    ) : (
                        <p className="text-gray-500 italic">No resistance levels detected</p>
                    )}
                </div>
            </div>

            {/* Support Levels */}
            <div>
                <h4 className="text-sm uppercase tracking-wider text-green-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Support (Below)
                </h4>
                <div className="space-y-2">
                    {support && support.length > 0 ? (
                        support.map((level, idx) => (
                            <LevelRow key={idx} level={level} index={idx} isResistance={false} />
                        ))
                    ) : (
                        <p className="text-gray-500 italic">No support levels detected</p>
                    )}
                </div>
            </div>
        </div>
    );
}
