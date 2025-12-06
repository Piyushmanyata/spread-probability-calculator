import { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import TickDistribution from './components/TickDistribution';
import ProbabilityCards from './components/ProbabilityCards';
import SupportResistance from './components/SupportResistance';
import ConditionalProbs from './components/ConditionalProbs';
import StatsPanel from './components/StatsPanel';
import SpreadOverview from './components/SpreadOverview';
import LoadingOverlay from './components/LoadingOverlay';
import AdvancedStats from './components/AdvancedStats';
import { SpreadCalculator, parseCSV, DEFAULT_CONFIG } from './lib/calculator';

export default function App() {
    const [results, setResults] = useState(null);
    const [tickDistribution, setTickDistribution] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);
    const [config] = useState(DEFAULT_CONFIG);

    const handleFilesSelected = useCallback(async (file1, file2) => {
        setIsLoading(true);
        setLoadingProgress(5);
        setError(null);
        setResults(null);

        try {
            // Read files
            setLoadingProgress(10);
            const [text1, text2] = await Promise.all([
                file1.text(),
                file2.text()
            ]);

            // Parse CSVs
            setLoadingProgress(20);
            const data1 = parseCSV(text1);
            const data2 = parseCSV(text2);

            if (data1.length === 0 || data2.length === 0) {
                throw new Error('One or both files contain no valid data');
            }

            // Run analysis with progress updates
            setLoadingProgress(30);
            const calculator = new SpreadCalculator(config);
            calculator.loadAndMerge(data1, data2);

            setLoadingProgress(40);
            calculator.calculateEmpiricalProbabilities();
            calculator.calculateVolumeWeighted();

            setLoadingProgress(55);
            calculator.calculateBootstrap();

            setLoadingProgress(70);
            calculator.calculateConditional();
            calculator.calculateSupportResistance();
            calculator.calculateStats();

            setLoadingProgress(85);
            // New calculations
            calculator.calculateStreaks();
            calculator.calculateRangeProbabilities();
            calculator.calculateExpectedValue();
            calculator.calculateWeekdayProbs();
            calculator.calculateRecentComparison();

            setLoadingProgress(95);
            const analysisResults = calculator.results;

            setResults(analysisResults);
            setTickDistribution(calculator.getTickDistribution());
            setLoadingProgress(100);

        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.message || 'An error occurred during analysis');
        } finally {
            setIsLoading(false);
            setLoadingProgress(0);
        }
    }, [config]);

    const handleReset = () => {
        setResults(null);
        setTickDistribution(null);
        setError(null);
    };

    return (
        <>
            {/* Loading Overlay */}
            <LoadingOverlay isVisible={isLoading} progress={loadingProgress} />

            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Fast Browser-Based Analysis
                        </div>
                    </header>

                    {/* Error Display */}
                    {error && (
                        <div className="glass-card p-4 mb-6 border-red-500/50 bg-red-500/10 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="font-medium text-red-400">Analysis Failed</p>
                                    <p className="text-sm text-gray-400">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Upload or Results */}
                    {!results ? (
                        <FileUpload onFilesSelected={handleFilesSelected} isLoading={isLoading} />
                    ) : (
                        <div className="animate-fade-in">
                            {/* Top Bar */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold gradient-text">Analysis Results</h2>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    New Analysis
                                </button>
                            </div>

                            {/* Results Grid */}
                            <div className="results-grid">
                                {/* Overview */}
                                <SpreadOverview results={results} />

                                {/* Tick Distribution Chart */}
                                <TickDistribution data={tickDistribution} />

                                {/* Probability Cards */}
                                <div className="md:col-span-1 lg:col-span-2">
                                    <ProbabilityCards
                                        empiricalRaw={results.empiricalRaw}
                                        empiricalFiltered={results.empiricalFiltered}
                                        volWeighted={results.volWeighted}
                                        bootstrap={results.bootstrap}
                                        config={config}
                                    />
                                </div>

                                {/* Support/Resistance */}
                                <SupportResistance
                                    data={results.supportResistance}
                                    tickSize={config.tickSize}
                                />

                                {/* Conditional Probabilities */}
                                <div className="full-width-card">
                                    <ConditionalProbs data={results.conditional} />
                                </div>

                                {/* Advanced Stats */}
                                <div className="full-width-card">
                                    <AdvancedStats
                                        streaks={results.streaks}
                                        rangeProbs={results.rangeProbs}
                                        expectedValue={results.expectedValue}
                                        weekday={results.weekday}
                                        recentComparison={results.recentComparison}
                                        config={config}
                                    />
                                </div>

                                {/* Stats Panel */}
                                <div className="full-width-card">
                                    <StatsPanel
                                        data={results.stats}
                                        spreadStats={results.spreadStats}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <footer className="mt-12 text-center text-gray-500 text-sm">
                                <p>
                                    Spread Probability Calculator • Ported from Python v8 •
                                    <span className="text-primary-400"> {results.nValid}</span> valid days analyzed
                                </p>
                            </footer>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
