import { useState, useCallback } from 'react';

export default function FileUpload({ onFilesSelected, isLoading }) {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [dragOver1, setDragOver1] = useState(false);
    const [dragOver2, setDragOver2] = useState(false);
    const [fileError, setFileError] = useState(null);

    const handleDrop = useCallback((e, setFile, setDragOver, fileNum) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files[0] || e.target.files?.[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.csv')) {
                setFile(file);
                setFileError(null);
            } else {
                setFileError(`File ${fileNum}: "${file.name}" is not a CSV file. Please upload a .csv file.`);
            }
        }
    }, []);

    const handleFileChange = useCallback((e, setFile, fileNum) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.csv')) {
                setFile(file);
                setFileError(null);
            } else {
                setFileError(`File ${fileNum}: "${file.name}" is not a CSV file. Please upload a .csv file.`);
            }
        }
    }, []);

    const handleSubmit = () => {
        if (file1 && file2) {
            onFilesSelected(file1, file2);
        }
    };

    const FileDropZone = ({ file, setFile, dragOver, setDragOver, label, id, fileNum }) => (
        <div
            className={`drop-zone rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'drag-over' : ''
                } ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => handleDrop(e, setFile, setDragOver, fileNum)}
            onClick={() => document.getElementById(id).click()}
        >
            <input
                type="file"
                id={id}
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileChange(e, setFile, fileNum)}
            />

            <div className="mb-4">
                {file ? (
                    <svg className="w-12 h-12 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    <svg className="w-12 h-12 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                )}
            </div>

            <p className="text-lg font-medium mb-1">
                {file ? file.name : label}
            </p>
            <p className="text-sm text-gray-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drop CSV or click to browse'}
            </p>
        </div>
    );

    return (
        <div className="glass-card p-8 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold gradient-text mb-3">
                    Spread Probability Calculator
                </h1>
                <p className="text-gray-400 text-lg">
                    Upload two CSV files to analyze spread movements
                </p>
            </div>

            {/* File Error Display */}
            {fileError && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{fileError}</span>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">1</span>
                            Front Leg Contract
                        </span>
                    </label>
                    <FileDropZone
                        file={file1}
                        setFile={setFile1}
                        dragOver={dragOver1}
                        setDragOver={setDragOver1}
                        label="Front Contract CSV"
                        id="file1-input"
                        fileNum={1}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-accent-600 text-white text-xs flex items-center justify-center">2</span>
                            Back Leg Contract
                        </span>
                    </label>
                    <FileDropZone
                        file={file2}
                        setFile={setFile2}
                        dragOver={dragOver2}
                        setDragOver={setDragOver2}
                        label="Back Contract CSV"
                        id="file2-input"
                        fileNum={2}
                    />
                </div>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={handleSubmit}
                    disabled={!file1 || !file2 || isLoading}
                    className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${file1 && file2 && !isLoading
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white glow-cyan transform hover:scale-105'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Calculate Probabilities
                        </span>
                    )}
                </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
                <p>Required columns: datetime, open, high, low, close, volume</p>
            </div>
        </div>
    );
}
