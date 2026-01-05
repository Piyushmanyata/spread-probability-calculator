import { memo } from 'react';

/**
 * RiskMeter - Speedometer-style risk visualization
 * Shows risk level from 0-100 with color zones
 */
function RiskMeter({ value = 50, size = 200 }) {
    // Clamp value between 0-100
    const clampedValue = Math.max(0, Math.min(100, value));

    // Calculate needle rotation (-90 to 90 degrees)
    const rotation = -90 + (clampedValue / 100) * 180;

    // Determine risk level and color
    const getRiskInfo = (v) => {
        if (v >= 70) return { level: 'HIGH', color: '#ef4444', bgColor: 'bg-red-500/20', textColor: 'text-red-400' };
        if (v >= 40) return { level: 'MEDIUM', color: '#f59e0b', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' };
        return { level: 'LOW', color: '#22c55e', bgColor: 'bg-green-500/20', textColor: 'text-green-400' };
    };

    const riskInfo = getRiskInfo(clampedValue);

    const radius = size / 2 - 20;
    const centerX = size / 2;
    const centerY = size / 2 + 10;

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
                {/* Background arc */}
                <defs>
                    <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="40%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="70%" stopColor="#f59e0b" />
                        <stop offset="80%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                </defs>

                {/* Outer arc (colored zones) */}
                <path
                    d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
                    fill="none"
                    stroke="url(#riskGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.3"
                />

                {/* Active arc - use large-arc-flag=1 when > 50% for correct rendering */}
                <path
                    d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${clampedValue > 50 ? 1 : 0} 1 ${centerX + radius * Math.cos(Math.PI - (clampedValue / 100) * Math.PI)} ${centerY - radius * Math.sin((clampedValue / 100) * Math.PI)}`}
                    fill="none"
                    stroke={riskInfo.color}
                    strokeWidth="12"
                    strokeLinecap="round"
                />

                {/* Needle */}
                <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
                    <line
                        x1={centerX}
                        y1={centerY}
                        x2={centerX}
                        y2={centerY - radius + 20}
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle cx={centerX} cy={centerY} r="8" fill={riskInfo.color} />
                    <circle cx={centerX} cy={centerY} r="4" fill="white" />
                </g>

                {/* Labels */}
                <text x={centerX - radius - 5} y={centerY + 20} fontSize="12" fill="#6b7280" textAnchor="middle">LOW</text>
                <text x={centerX} y={20} fontSize="12" fill="#6b7280" textAnchor="middle">MEDIUM</text>
                <text x={centerX + radius + 5} y={centerY + 20} fontSize="12" fill="#6b7280" textAnchor="middle">HIGH</text>
            </svg>

            {/* Value display */}
            <div className={`-mt-4 px-4 py-2 rounded-full ${riskInfo.bgColor} border border-gray-700`}>
                <span className={`font-mono font-bold text-xl ${riskInfo.textColor}`}>
                    {Math.round(clampedValue)}
                </span>
                <span className="text-gray-400 text-sm ml-1">/ 100</span>
            </div>

            {/* Risk level badge */}
            <p className={`mt-2 text-sm font-medium ${riskInfo.textColor}`}>
                {riskInfo.level} RISK
            </p>
        </div>
    );
}

export default memo(RiskMeter);
