import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts';

function TickDistribution({ data }) {
    if (!data || data.length === 0) return null;

    const getBarColor = (tick) => {
        if (tick > 0) return 'url(#greenGradient)';
        if (tick < 0) return 'url(#redGradient)';
        return '#6b7280';
    };

    // Guard against empty data to prevent division by zero
    const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="glass-card-premium px-4 py-3 border border-gray-600 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${d.tick > 0 ? 'bg-green-500' : d.tick < 0 ? 'bg-red-500' : 'bg-gray-500'}`} />
                        <span className="font-mono font-bold text-lg text-white">
                            {d.tick > 0 ? '+' : ''}{d.tick} ticks
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-400">Count</span>
                            <span className="font-semibold text-white">{d.count}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-400">Probability</span>
                            <span className="font-semibold text-primary-400">{d.pct.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-400">Percentile</span>
                            <span className="font-semibold text-accent-400">{((d.count / maxCount) * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card-premium p-6 full-width-card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="gradient-text">Tick Distribution</span>
                </h3>
                <div className="text-xs text-gray-500 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700">
                    {data.length} unique moves
                </div>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <defs>
                            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="tick"
                            tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                            tickFormatter={(v) => v > 0 ? `+${v}` : v}
                            axisLine={{ stroke: '#374151' }}
                            tickLine={{ stroke: '#374151' }}
                        />
                        <YAxis
                            tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                            axisLine={{ stroke: '#374151' }}
                            tickLine={{ stroke: '#374151' }}
                            label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }} />
                        <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="5 5" strokeWidth={2} />
                        <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getBarColor(entry.tick)}
                                    className="transition-all duration-300 hover:opacity-80"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-center gap-8 text-sm">
                <span className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded-sm bg-gradient-to-b from-green-500 to-green-600" />
                    <span className="text-gray-400">Up Moves</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded-sm bg-gradient-to-b from-red-500 to-red-600" />
                    <span className="text-gray-400">Down Moves</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded-sm bg-gray-500" />
                    <span className="text-gray-400">No Change</span>
                </span>
            </div>
        </div>
    );
}

export default memo(TickDistribution);

