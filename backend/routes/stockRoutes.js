const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const { getStockList } = require('../utils/stockListService');
const { ensureMarketData, getHistory } = require('../utils/marketDataService');

const router = express.Router();
// Helper function to calculate the start date based on the period
const calculateStartDate = (period) => {
    const now = new Date();
    switch (period) {
        case '1m':
            // 1 month ago.
            return new Date(now.setMonth(now.getMonth() - 1));
        case '1y':
            // 1 year ago.
            return new Date(now.setFullYear(now.getFullYear() - 1));
        case '5y':
            // 5 years ago.
            return new Date(now.setFullYear(now.getFullYear() - 5));
        default:
            throw new Error('Invalid period specified');
    }
};

// Endpoint to fetch historical stock data
router.get('/stock/history/:stockName', async (req, res) => {
    const { stockName } = req.params;
    // Default suffix to NSE.
    const { period = '1y', suffix = 'NS' } = req.query;

    try {
        let resolvedSuffix = suffix;
        if (resolvedSuffix === 'BSE') {
            resolvedSuffix = 'BO';
        } else if (resolvedSuffix === 'NSE') {
            resolvedSuffix = 'NS';
        }
        // Start date.
        const startDate = calculateStartDate(period);
        await ensureMarketData({ suffix: resolvedSuffix });
        // Fetch historical data from cached market data.
        const historicalData = getHistory(stockName, resolvedSuffix, startDate);

        if (!historicalData || historicalData.length === 0) {
            return res.status(404).json({ error: 'No historical data found.' });
        }

        // Format data for response.
        const formattedData = historicalData.map((item) => ({
            date: new Date(`${item.date}T00:00:00Z`).toLocaleDateString(),
            close: item.close,
        }));

        // Calculate percentage change.
        const initialClose = historicalData[0].close;
        const finalClose = historicalData[historicalData.length - 1].close;
        const percentageChange = ((finalClose - initialClose) / initialClose) * 100;

        res.json({
            data: formattedData,
            // Rounded to 2 decimal places.
            percentageChange: percentageChange.toFixed(2),
        });
    } catch (error) {
        console.error(`Error fetching historical data for ${stockName}.${suffix}:`, error.message);
        res.status(500).json({ error: `Failed to fetch historical data for ${stockName}.${suffix}` });
    }
});

// API Endpoint to combine and filter unique stocks from NSE and BSE files.
router.get('/stocks/all', verifyToken, async (req, res) => {
    try {
        const stocks = await getStockList();
        res.status(200).json({ data: stocks });
    } catch (error) {
        console.error('Error fetching dynamic stock list:', error.message);
        res.status(500).json({ message: 'Failed to fetch stock list dynamically' });
    }
});

module.exports = router;
