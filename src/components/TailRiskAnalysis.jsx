import { memo } from 'react';

function TailRiskAnalysis({ data, tickSize }) {
    if (!data || Object.keys(data).length === 0) return null;

    const formatNum = (v, d = 2) =>
        v !== undefined && v !== null && !isNaN(v) && isFinite(v) ? v.toFixed(d) : '-';

    const formatTicks = (v) =>
        v !== undefined && v !== null && !isNaN(v) ? `${v.toFixed(1)}T` : '-';

    const getRiskColor = (level) => {
        switch (level) {
            case 'EXTREME': return 'text-red-500 bg-red-500/10 border-red-500/30';
            case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            default: return 'text-green-400 bg-green-500/10 border-green-500/30';
        }
    };

    const getRiskIcon = (level) => {
        switch (level) {
            case 'EXTREME': return '🚨';
            case 'HIGH': return '⚠️';
            case 'MEDIUM': return '📊';
            default: return '✓';
        }
    };

    const riskLevel = data.riskLevel || 'LOW';

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Tail Risk Analysis
                <span className={`ml-auto px-3 py-1 text-sm rounded-full border ${getRiskColor(riskLevel)}`}>
                    {getRiskIcon(riskLevel)} {riskLevel} RISK
                </span>
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* VaR Section */}
                <div className="p-4 rounded-lg bg-gray-800/50">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Value at Risk (VaR)</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">95% VaR (Historical)</span>
                            <span className="font-mono text-yellow-400">{formatTicks(data.historicalVaR95)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">99% VaR (Historical)</span>
                            <span className="font-mono text-red-400">{formatTicks(data.historicalVaR99)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-xs">vs Parametric (Normal)</span>
                                <span className={`font-mono text-xs ${data.varRatio99 > 1.2 ? 'text-red-400' : 'text-green-400'}`}>
                                    {formatNum(data.varRatio99, 2)}x
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expected Shortfall Section */}
                <div className="p-4 rounded-lg bg-gray-800/50">
                    <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Expected Shortfall (CVaR)</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">95% ES</span>
                            <span className="font-mono text-yellow-400">{formatTicks(data.expectedShortfall95)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">99% ES</span>
                            <span className="font-mono text-red-400">{formatTicks(data.expectedShortfall99)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-xs">ES/VaR Ratio (99%)</span>
                                <span className={`font-mono text-xs ${data.esVarRatio99 > 1.25 ? 'text-orange-400' : 'text-gray-400'}`}>
                                    {formatNum(data.esVarRatio99, 2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Extreme Move Analysis */}
            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Extreme Move Analysis</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Max Loss</p>
                        <p className="font-mono text-lg text-red-400">-{formatTicks(data.maxLoss)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Max Gain</p>
                        <p className="font-mono text-lg text-green-400">+{formatTicks(data.maxGain)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Max Loss (σ)</p>
                        <p className={`font-mono text-lg ${data.sigmaOfMaxLoss > 4 ? 'text-red-400' : 'text-white'}`}>
                            {formatNum(data.sigmaOfMaxLoss, 1)}σ
                        </p>
                    </div>
                </div>
            </div>

            {/* Fat Tail Indicator */}
            {data.isFatTailed && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                    <p className="text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>
                            <strong>Fat Tails Detected:</strong> Historical returns show heavier tails than Normal distribution.
                            Gaussian VaR underestimates risk by {formatNum((data.varRatio99 - 1) * 100, 0)}%.
                        </span>
                    </p>
                </div>
            )}

            {/* Interpretation */}
            <p className="mt-4 text-xs text-gray-500">
                VaR = Max expected loss at confidence level. ES = Average loss if VaR is breached.
                ES/VaR &gt; 1.25 indicates fat tails; ratio &gt; 1.15 is normal.
            </p>
        </div>
    );
}

export default memo(TailRiskAnalysis);
