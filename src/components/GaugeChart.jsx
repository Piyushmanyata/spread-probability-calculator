import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/**
 * GaugeChart - Semicircular gauge for visualizing probabilities
 * Shows a value from 0-100 with color gradient
 */
function GaugeChart({ value = 50, label = '', size = 120, colorScheme = 'default' }) {
    // Clamp value between 0-100
    const clampedValue = Math.max(0, Math.min(100, value));

    // Create data for the gauge (180 degree arc)
    const data = [
        { name: 'value', value: clampedValue },
        { name: 'remaining', value: 100 - clampedValue },
    ];

    // Color schemes
    const colors = {
        default: ['#06b6d4', '#1f2937'],
        bullish: ['#22c55e', '#1f2937'],
        bearish: ['#ef4444', '#1f2937'],
        warning: ['#f59e0b', '#1f2937'],
        risk: clampedValue > 70 ? ['#ef4444', '#1f2937'] :
            clampedValue > 40 ? ['#f59e0b', '#1f2937'] :
                ['#22c55e', '#1f2937'],
    };

    const selectedColors = colors[colorScheme] || colors.default;

    return (
        <div className="relative flex flex-col items-center">
            <div style={{ width: size, height: size / 2 + 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={size * 0.35}
                            outerRadius={size * 0.45}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={selectedColors[index]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="absolute bottom-0 text-center" style={{ marginBottom: '-5px' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: selectedColors[0] }}>
                    {Math.round(clampedValue)}%
                </p>
                {label && <p className="text-xs text-gray-400 mt-1">{label}</p>}
            </div>
        </div>
    );
}

export default memo(GaugeChart);
