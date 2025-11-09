const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const fetchCompanyLogo = require('../utils/fetchCompanyLogo');
const { getIndexConstituents } = require('../utils/indexService');
const nseStocks = require('../data/nse-stocks.json');
const bseStocks = require('../data/bse-stocks.json');

const router = express.Router();

const formatSectorName = (sector) => sector.replace(/-/g, '/').replace(/_/g, ' ');

const getSectorStocks = (sectorName, suffix) => {
  const source = suffix === 'BO' ? bseStocks : nseStocks;
  const normalized = (sectorName || '').trim().toLowerCase();
  return source.filter((stock) => (stock.sector || '').trim().toLowerCase() === normalized);
};

const fetchStockData = async (symbol, suffix) => {
  try {
    if (!symbol || typeof symbol !== 'string') {
      return { price: null, change: null };
    }

    const stockData = await yahooFinance.quote(`${symbol}.${suffix}`);
    return {
      price: stockData?.regularMarketPrice || null,
      change: stockData?.regularMarketChangePercent || null,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}.${suffix}:`, error.message);
    return { price: null, change: null };
  }
};

router.get('/index/:index', async (req, res) => {
  try {
    const { index } = req.params;
    const { suffix } = req.query;

    if (!index || !suffix) {
      return res.status(400).json({ message: 'Index and suffix are required.' });
    }

    if (!['NS', 'BO'].includes(suffix)) {
      return res.status(400).json({ message: 'Invalid suffix. Use NS or BO.' });
    }

    const normalizedIndex = index.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const constituents = await getIndexConstituents(normalizedIndex);

    if (!constituents || !constituents.length) {
      return res.status(404).json({ message: `No constituents found for ${index}` });
    }

    const stocks = await Promise.all(
      constituents.map(async (row) => {
        const symbol = row.symbol;
        if (!symbol) return null;

        const { price, change } = await fetchStockData(symbol, suffix);
        const logoUrl = row.website ? await fetchCompanyLogo(row.website) : null;

        return {
          symbol,
          suffix,
          name: row.name || 'Unknown',
          price,
          change,
          sector: row.sector || 'Unknown',
          website: row.website || null,
          logo: logoUrl,
        };
      })
    );

    const filteredStocks = stocks.filter((stock) => stock && stock.price !== null);

    if (!filteredStocks.length) {
      return res.status(404).json({ message: 'No valid stocks found.' });
    }

    res.status(200).json(filteredStocks);
  } catch (error) {
    console.error('Error fetching index stocks:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/sector/:sector', async (req, res) => {
  try {
    const { sector } = req.params;
    const { suffix } = req.query;

    if (!sector || !suffix) {
      return res.status(400).json({ message: 'Sector and suffix are required.' });
    }

    if (!['NS', 'BO'].includes(suffix)) {
      return res.status(400).json({ message: 'Invalid suffix. Use NS or BO.' });
    }

    const formattedSector = formatSectorName(sector);
    const sectorStocks = getSectorStocks(formattedSector, suffix);

    if (!sectorStocks.length) {
      return res.status(404).json({ message: `No stocks found for sector ${formattedSector}` });
    }

    const stocks = (
      await Promise.all(
        sectorStocks.map(async (stock) => {
          const { price, change } = await fetchStockData(stock.symbol, suffix);
          const logoUrl = stock.website ? await fetchCompanyLogo(stock.website) : null;

          return {
            symbol: stock.symbol,
            suffix,
            name: stock.name,
            price,
            change,
            sector: stock.sector,
            website: stock.website || null,
            logo: logoUrl || null,
          };
        })
      )
    ).filter((stock) => stock.price !== null && stock.change !== null);

    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks by sector:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
