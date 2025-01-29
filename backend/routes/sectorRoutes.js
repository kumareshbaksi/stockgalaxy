const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const yahooFinance = require('yahoo-finance2').default;
const fetchCompanyLogo = require('../utils/fetchCompanyLogo');
const fs = require('fs');

const router = express.Router();

// Utility to replace special characters.
const formatSectorName = (sector) => {
  return sector.replace(/-/g, '/').replace(/_/g, ' ');
};

// Utility to read data from `.xlsx` files.
const readExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
   // Convert sheet to JSON.
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

// Utility to fetch stock data from Yahoo Finance
const fetchStockData = async (symbol, suffix) => {
  try {
    if (!symbol || typeof symbol !== 'string') {
      console.warn(`Invalid or undefined symbol: ${symbol}`);
      return {
        price: null,
        change: null,
      };
    }

    const stockData = await yahooFinance.quote(`${symbol}.${suffix}`);
    return {
      price: stockData?.regularMarketPrice || null,
      change: stockData?.regularMarketChangePercent || null,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}.${suffix}:`, error.message);
    return {
      price: null,
      change: null,
    };
  }
};

// Endpoint to fetch stocks from a dynamic index (e.g., SENSEX or NIFTY50)
router.get('/index/:index', async (req, res) => {
  try {
    const { index } = req.params; // Dynamic index (e.g., SENSEX or NIFTY50)
    const { suffix } = req.query; // Suffix (e.g., NS or BO)

    // Validate inputs.
    if (!index || !suffix) {
      return res.status(400).json({ message: 'Index and suffix are required.' });
    }

    // Validate suffix.
    if (!['NS', 'BO'].includes(suffix)) {
      return res.status(400).json({ message: 'Invalid suffix. Use NS or BO.' });
    }

    // Determine the file path based on the index.
    const filePath = path.join(__dirname, `../file/${index.toUpperCase()}.xlsx`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: `File for index ${index} not found.` });
    }

    // Read the Excel file
    const stockData = readExcel(filePath);

    // Validate if Excel data is empty
    if (!stockData || stockData.length === 0) {
      return res.status(400).json({ message: `No data found in ${index} file.` });
    }

    // Fetch stock data from Yahoo Finance for each stock
    const stocks = await Promise.all(
      stockData.map(async (row) => {
        const symbol = row.SYMBOL;
        const name = row.NAME || 'Unknown';
        const sector = row.SECTOR || 'Unknown';
        const url = row.URL || null;

        // Skip rows with undefined SYMBOL
        if (!symbol) return null;

        const { price, change } = await fetchStockData(symbol, suffix);
        const logoUrl = url ? await fetchCompanyLogo(url) : null;

        return {
          symbol,
          suffix,
          name,
          price,
          change,
          sector,
          website: url,
          logo: logoUrl,
        };
      })
    );

    // Filter out null values
    const filteredStocks = stocks.filter((stock) => stock && stock.price !== null);

    if (filteredStocks.length === 0) {
      return res.status(404).json({ message: 'No valid stocks found.' });
    }

    // Return the filtered stocks
    res.status(200).json(filteredStocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Endpoint to fetch stocks by sector and suffix.
router.get('/sector/:sector', async (req, res) => {
  try {
    const { sector } = req.params;
    const { suffix } = req.query;

    // Validate inputs
    if (!sector || !suffix) {
      return res.status(400).json({ message: 'Sector and suffix are required.' });
    }

    // Replace special characters in the sector name.
    const formattedSector = formatSectorName(sector);

    // Load the appropriate file based on the suffix.
    const filePath =
      suffix === 'NS'
        ? path.join(__dirname, '../file/NSE.xlsx')
        : suffix === 'BO'
        ? path.join(__dirname, '../file/BSE.xlsx')
        : null;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: 'Invalid suffix. Use NS or BO.' });
    }

    // Read the Excel file.
    const sheetData = readExcel(filePath);

    // Filter stocks by the provided sector.
    const stocks = (
      await Promise.all(
        sheetData
          // Exclude rows with undefined SYMBOL.
          .filter((row) => row.SECTOR === formattedSector && row.SYMBOL)
          .map(async (row) => {

            const { price, change } = await fetchStockData(row.SYMBOL, suffix);
            const logoUrl = row.URL ? await fetchCompanyLogo(row.URL) : null;

            return {
              symbol: row.SYMBOL,
              suffix,
              name: row.NAME,
              price,
              change,
              sector: row.SECTOR,
              website: row.URL || null,
              logo: logoUrl || null,
            };
          })
      )
    // Exclude stocks with null price or change.
    ).filter((stock) => stock.price !== null && stock.change !== null);

    // Return the filtered stocks.
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks by sector:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
