export default function SpreadOverview({ results }) {
    if (!results) return null;

    const { nValid, nRaw, nOutliers, nWarmup, dateRange, currentPrice, spreadStats, totalVolume } = results;

    const StatCard = ({ icon, label, value, subtext, colorClass = 'text-white', highlight = false }) => (
        <div className={`glass-card p-4 glass-card-hover ${highlight ? 'glow-border' : ''}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${highlight ? 'bg-gradient-to-br from-primary-500/30 to-accent-500/30' : 'bg-primary-500/20'} text-primary-400`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
                    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
                </div>
            </div>
        </div>
    );

    const formatDateShort = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        });
    };

    const formatVolume = (vol) => {
        if (!vol) return '-';
        if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
        return vol.toLocaleString();
    };

    return (
        <div className="glass-card p-6 full-width-card">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="gradient-text">Analysis Overview</span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    highlight={true}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>}
                    label="Current Spread"
                    value={currentPrice?.toFixed(4) || '-'}
                    colorClass="gradient-text"
                />

                <StatCard
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>}
                    label="Valid Days"
                    value={nValid || 0}
                    subtext={`${nRaw || 0} total`}
                    colorClass="text-green-400"
                />

                <StatCard
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>}
                    label="Outliers"
                    value={nOutliers || 0}
                    subtext={`${nWarmup || 0} warm-up`}
                    colorClass={nOutliers > 0 ? 'text-yellow-400' : 'text-green-400'}
                />

                <StatCard
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>}
                    label="Date Range"
                    value={formatDateShort(dateRange?.start)}
                    subtext={`to ${formatDateShort(dateRange?.end)}`}
                />

                <StatCard
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>}
                    label="Spread Range"
                    value={spreadStats?.min?.toFixed(3) || '-'}
                    subtext={`to ${spreadStats?.max?.toFixed(3) || '-'}`}
                />

                <StatCard
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>}
                    label="Total Volume"
                    value={formatVolume(totalVolume)}
                    colorClass="text-primary-400"
                />
            </div>
        </div>
    );
}
