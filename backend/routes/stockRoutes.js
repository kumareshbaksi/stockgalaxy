const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const verifyToken = require('../middleware/verifyToken');
const fs = require('fs');
const xlsx = require('xlsx');
const csv = require('csv-parser');

const router = express.Router();

// Function to read Excel files.
const readExcel = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
};

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
    const { period = '1y', interval, suffix = 'NS' } = req.query;

    try {
        // Start date.
        const period1 = calculateStartDate(period).toISOString();
        // End date (today).
        const period2 = new Date().toISOString();
        // Set default interval.
        const selectedInterval = interval || (period === '1m' ? '1d' : '1mo');

        // Fetch historical data from Yahoo Finance.
        const historicalData = await yahooFinance.historical(`${stockName}.${suffix}`, {
            period1,
            period2,
            interval: selectedInterval,
        });

        if (!historicalData || historicalData.length === 0) {
            return res.status(404).json({ error: 'No historical data found.' });
        }

        // Format data for response.
        const formattedData = historicalData.map((item) => ({
            date: new Date(item.date).toLocaleDateString(),
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
        const nseFilePath = './file/NSE.xlsx';
        const bseFilePath = './file/BSE.xlsx';

        // Read data from NSE and BSE files.
        const nseData = readExcel(nseFilePath);
        const bseData = readExcel(bseFilePath);

        // Combine data and ensure uniqueness by SYMBOL.
        const combinedData = [...nseData, ...bseData];
        const uniqueData = Array.from(
            new Map(combinedData.map((item) => [item.SYMBOL, item])).values()
        ).map((stock) => ({
            symbol: stock.SYMBOL,
            companyName: stock.NAME,
        }));

        res.status(200).json({ data: uniqueData });
    } catch (error) {
        console.error('Error processing stocks:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
