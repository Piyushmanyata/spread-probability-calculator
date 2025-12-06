import { useEffect, useState } from 'react';

export default function LoadingOverlay({ isVisible, progress = 0 }) {
    const [dots, setDots] = useState('');

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 400);
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-card p-8 text-center max-w-sm mx-4">
                {/* Animated Logo */}
                <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-2 gradient-text">
                    Analyzing Data{dots}
                </h3>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Status text */}
                <p className="text-sm text-gray-400">
                    {progress < 20 && 'Loading data...'}
                    {progress >= 20 && progress < 40 && 'Detecting outliers...'}
                    {progress >= 40 && progress < 60 && 'Calculating probabilities...'}
                    {progress >= 60 && progress < 80 && 'Running bootstrap...'}
                    {progress >= 80 && progress < 95 && 'Detecting support/resistance...'}
                    {progress >= 95 && 'Finalizing results...'}
                </p>
            </div>
        </div>
    );
}
