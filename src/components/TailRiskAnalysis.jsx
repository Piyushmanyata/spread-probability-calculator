import { memo, useState } from 'react';

/**
 * TailRiskAnalysis - Simplified tail risk display with visual indicators
 * Shows risk in plain English with optional technical details
 */
function TailRiskAnalysis({ data, tickSize }) {
    const [showDetails, setShowDetails] = useState(false);

    if (!data || Object.keys(data).length === 0) return null;

    const formatNum = (v, d = 2) =>
        v !== undefined && v !== null && !isNaN(v) && isFinite(v) ? v.toFixed(d) : '-';

    const formatTicks = (v) =>
        v !== undefined && v !== null && !isNaN(v) ? `${v.toFixed(1)}` : '-';

    const getRiskInfo = (level) => {
        switch (level) {
            case 'EXTREME': return {
                color: 'text-red-500',
                bgColor: 'bg-red-500/10',
                borderColor: 'border-red-500/30',
                icon: '🚨',
                description: "Very high risk - extreme moves are likely"
            };
            case 'HIGH': return {
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10',
                borderColor: 'border-orange-500/30',
                icon: '⚠️',
                description: "Elevated risk - be cautious with position size"
            };
            case 'MEDIUM': return {
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-500/10',
                borderColor: 'border-yellow-500/30',
                icon: '📊',
                description: "Moderate risk - normal market conditions"
            };
            default: return {
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-500/30',
                icon: '✓',
                description: "Low risk - calm market conditions"
            };
        }
    };

    const riskLevel = data.riskLevel || 'LOW';
    const riskInfo = getRiskInfo(riskLevel);

    // Calculate visual bar width (0-100)
    const riskBarWidth = riskLevel === 'EXTREME' ? 100 :
        riskLevel === 'HIGH' ? 75 :
            riskLevel === 'MEDIUM' ? 50 : 25;

    return (
        <div className="glass-card p-6 glass-card-hover">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Worst Case Scenarios
                <span className={`ml-auto px-3 py-1 text-sm rounded-full border ${riskInfo.bgColor} ${riskInfo.borderColor} ${riskInfo.color}`}>
                    {riskInfo.icon} {riskLevel} RISK
                </span>
            </h3>

            {/* Main Risk Description */}
            <div className={`p-4 rounded-lg mb-6 ${riskInfo.bgColor} border ${riskInfo.borderColor}`}>
                <p className={`${riskInfo.color} font-medium`}>{riskInfo.description}</p>
            </div>

            {/* Visual Risk Meter */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Low Risk</span>
                    <span>High Risk</span>
                </div>
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden relative">
                    {/* Gradient background showing zones */}
                    <div className="absolute inset-0 flex">
                        <div className="flex-1 bg-green-500/30"></div>
                        <div className="flex-1 bg-yellow-500/30"></div>
                        <div className="flex-1 bg-orange-500/30"></div>
                        <div className="flex-1 bg-red-500/30"></div>
                    </div>
                    {/* Risk indicator */}
                    <div
                        className="absolute h-full w-2 bg-white rounded-full shadow-lg transition-all duration-500"
                        style={{ left: `calc(${riskBarWidth}% - 4px)` }}
                    />
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500 mb-1">Typical Bad Day</p>
                    <p className="font-mono text-2xl text-yellow-400">-{formatTicks(data.historicalVaR95)}</p>
                    <p className="text-xs text-gray-500">ticks (95% of days better)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500 mb-1">Really Bad Day</p>
                    <p className="font-mono text-2xl text-red-400">-{formatTicks(data.historicalVaR99)}</p>
                    <p className="text-xs text-gray-500">ticks (99% of days better)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500 mb-1">Worst Ever</p>
                    <p className="font-mono text-2xl text-red-500">-{formatTicks(data.maxLoss)}</p>
                    <p className="text-xs text-gray-500">ticks (historical max)</p>
                </div>
            </div>

            {/* Best Day for Context */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
                <span className="text-gray-400">Best day ever:</span>
                <span className="font-mono text-xl text-green-400">+{formatTicks(data.maxGain)} ticks</span>
            </div>

            {/* Fat Tails Warning - Plain English */}
            {data.isFatTailed && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💥</span>
                        <div>
                            <p className="text-red-400 font-medium">Extreme Moves Happen More Than Expected</p>
                            <p className="text-sm text-gray-400 mt-1">
                                This spread has "fat tails" - meaning big surprises (both up and down)
                                happen about {formatNum((data.varRatio99 - 1) * 100, 0)}% more often than normal patterns would suggest.
                            </p>
                        </div>
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
                <div className="mt-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700 text-sm">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-2">Value at Risk (VaR)</p>
                            <p className="text-gray-400">95% VaR: <span className="text-white font-mono">{formatTicks(data.historicalVaR95)}T</span></p>
                            <p className="text-gray-400">99% VaR: <span className="text-white font-mono">{formatTicks(data.historicalVaR99)}T</span></p>
                            <p className="text-gray-400">VaR Ratio (99%): <span className={`font-mono ${data.varRatio99 > 1.2 ? 'text-red-400' : 'text-green-400'}`}>{formatNum(data.varRatio99)}x</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-2">Expected Shortfall (CVaR)</p>
                            <p className="text-gray-400">95% ES: <span className="text-white font-mono">{formatTicks(data.expectedShortfall95)}T</span></p>
                            <p className="text-gray-400">99% ES: <span className="text-white font-mono">{formatTicks(data.expectedShortfall99)}T</span></p>
                            <p className="text-gray-400">ES/VaR Ratio: <span className="text-white font-mono">{formatNum(data.esVarRatio99)}</span></p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                        VaR = Maximum expected loss at confidence level. ES = Average loss when VaR is breached.
                    </p>
                </div>
            )}
        </div>
    );
}

export default memo(TailRiskAnalysis);

