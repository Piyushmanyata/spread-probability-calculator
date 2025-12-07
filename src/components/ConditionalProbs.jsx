import { memo } from 'react';

function ConditionalProbs({ data }) {
    if (!data || (Object.keys(data).length === 0)) return null;

    const { afterUpMove, afterDownMove } = data;

    // Pre-compute bias values outside JSX for clarity
    const upBias = afterUpMove
        ? (() => {
            const denom = afterUpMove.probContinueUp + afterUpMove.probReverseDown;
            return denom === 0 ? 50 : (afterUpMove.probReverseDown / denom) * 100;
        })()
        : 50;

    const downBias = afterDownMove
        ? (() => {
            const denom = afterDownMove.probContinueDown + afterDownMove.probReverseUp;
            return denom === 0 ? 50 : (afterDownMove.probReverseUp / denom) * 100;
        })()
        : 50;

    const upActivity = afterUpMove
        ? (afterUpMove.probContinueUp + afterUpMove.probReverseDown) * 100
        : 0;

    const downActivity = afterDownMove
        ? (afterDownMove.probContinueDown + afterDownMove.probReverseUp) * 100
        : 0;

    const BiasIndicator = ({ bias, activity }) => {
        // FIX: Guard against NaN from 0/0 division
        const safeBias = isNaN(bias) ? 50 : bias;
        const safeActivity = isNaN(activity) ? 0 : activity;
        const activityLabel = safeActivity > 60 ? 'High' : safeActivity > 30 ? 'Medium' : 'Low';
        const activityColor = safeActivity > 60 ? 'text-green-400' : safeActivity > 30 ? 'text-yellow-400' : 'text-gray-400';

        return (
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700">
                <div className="flex-1">
                    <span className="text-xs text-gray-500 uppercase">Reversal Bias</span>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                                style={{ width: `${safeBias}%` }}
                            />
                        </div>
                        <span className="font-mono text-sm text-primary-400">{safeBias.toFixed(0)}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <span className="text-xs text-gray-500 uppercase">Activity</span>
                    <p className={`font-semibold ${activityColor}`}>
                        {safeActivity.toFixed(0)}% ({activityLabel})
                    </p>
                </div>
            </div>
        );
    };

    const ProbRow = ({ label, value, colorClass }) => {
        // Guard against undefined/NaN values
        const safeValue = (value !== undefined && value !== null && !isNaN(value)) ? value : 0;
        return (
            <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">{label}</span>
                <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${colorClass === 'green' ? 'bg-green-500' :
                                colorClass === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                }`}
                            style={{ width: `${safeValue * 100}%` }}
                        />
                    </div>
                    <span className={`font-mono font-semibold w-14 text-right ${colorClass === 'green' ? 'text-green-400' :
                        colorClass === 'red' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                        {(safeValue * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Conditional Probabilities
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
                {/* After UP Move */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-transparent border border-green-500/20">
                    <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 14l5-5 5 5H7z" />
                        </svg>
                        After UP Move
                    </h4>

                    {afterUpMove ? (
                        <>
                            <p className="text-xs text-gray-500 mb-3">n = {afterUpMove.nSamples} samples</p>

                            <ProbRow
                                label="Continue UP"
                                value={afterUpMove.probContinueUp}
                                colorClass="green"
                            />
                            <ProbRow
                                label="Reverse DOWN"
                                value={afterUpMove.probReverseDown}
                                colorClass="red"
                            />
                            <ProbRow
                                label="Unchanged"
                                value={afterUpMove.probUnchanged}
                                colorClass="gray"
                            />

                            <BiasIndicator bias={upBias} activity={upActivity} />
                        </>
                    ) : (
                        <p className="text-gray-500 italic">Insufficient samples</p>
                    )}
                </div>

                {/* After DOWN Move */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-900/20 to-transparent border border-red-500/20">
                    <h4 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                        After DOWN Move
                    </h4>

                    {afterDownMove ? (
                        <>
                            <p className="text-xs text-gray-500 mb-3">n = {afterDownMove.nSamples} samples</p>

                            <ProbRow
                                label="Continue DOWN"
                                value={afterDownMove.probContinueDown}
                                colorClass="red"
                            />
                            <ProbRow
                                label="Reverse UP"
                                value={afterDownMove.probReverseUp}
                                colorClass="green"
                            />
                            <ProbRow
                                label="Unchanged"
                                value={afterDownMove.probUnchanged}
                                colorClass="gray"
                            />

                            <BiasIndicator bias={downBias} activity={downActivity} />
                        </>
                    ) : (
                        <p className="text-gray-500 italic">Insufficient samples</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(ConditionalProbs);

