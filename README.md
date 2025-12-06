# Spread Probability Calculator

A fast, browser-based spread probability calculator for financial analysis. Ported from Python to React for client-side execution.

## Features

- 📊 **Dual-Regime Probabilities** - Filtered vs raw data analysis
- 📈 **Volume-Weighted Probabilities** - Account for trading volume
- 🎯 **Support/Resistance Detection** - Automated S/R level identification
- 📉 **Bootstrap Confidence Intervals** - Statistical reliability measures
- 🔄 **Conditional Probabilities** - After UP/DOWN move analysis
- 📅 **Weekday Analysis** - Day-of-week patterns
- 📊 **Streak Analysis** - Consecutive move probabilities
- ⚡ **Client-Side Execution** - All calculations run in browser

## Tech Stack

- **React** + **Vite** - Fast development and builds
- **Recharts** - Beautiful, responsive charts
- **TailwindCSS** - Premium dark theme design
- **jStat** - Statistical calculations
- **PapaParse** - Robust CSV parsing

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Prepare two CSV files with columns: `datetime`, `open`, `high`, `low`, `close`, `volume`
2. Upload both files via the drag-and-drop interface
3. View comprehensive probability analysis

## Deployment

Configured for Vercel deployment:

```bash
vercel deploy
```

## License

MIT
