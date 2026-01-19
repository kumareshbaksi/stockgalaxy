const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const fetchCompanyLogo = require('../utils/fetchCompanyLogo');
const { getIndexConstituents } = require('../utils/indexService');
const { isIndianMarketOpen } = require('../utils/marketHours');
const { canAttemptClosedFetch, markClosedFetchAttempt } = require('../utils/closedFetchGuard');
const nseStocks = require('../data/nse-stocks.json');
const bseStocks = require('../data/bse-stocks.json');

const router = express.Router();

const QUOTE_CACHE_TTL_MS =
  Number.parseInt(
    process.env.INDEX_QUOTE_CACHE_TTL_MS || process.env.QUOTE_CACHE_TTL_MS || '20000',
    10
  ) || 20000;
const QUOTE_BATCH_SIZE = Number.parseInt(process.env.QUOTE_BATCH_SIZE || '50', 10) || 50;
const quoteResponseCache = new Map();

const formatSectorName = (sector) => sector.replace(/-/g, '/').replace(/_/g, ' ');

const buildCacheKey = (scope, name, suffix) => `${scope}:${name}:${suffix}`;

const getCachedResponse = (key) => {
  const entry = quoteResponseCache.get(key);
  if (!entry) {
    return null;
  }
  return entry.expiresAt > Date.now() ? entry.data : null;
};

const getStaleResponse = (key) => {
  const entry = quoteResponseCache.get(key);
  return entry ? entry.data : null;
};

const setCachedResponse = (key, data) => {
  quoteResponseCache.set(key, {
    data,
    expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
  });
};

const getSectorStocks = (sectorName, suffix) => {
  const source = suffix === 'BO' ? bseStocks : nseStocks;
  const normalized = (sectorName || '').trim().toLowerCase();
  return source.filter((stock) => (stock.sector || '').trim().toLowerCase() === normalized);
};

const chunkSymbols = (symbols, size) => {
  const chunks = [];
  for (let i = 0; i < symbols.length; i += size) {
    chunks.push(symbols.slice(i, i + size));
  }
  return chunks;
};

const mergeQuoteBatch = (target, batch) => {
  if (!batch) {
    return;
  }
  if (batch instanceof Map) {
    batch.forEach((value, key) => {
      target[key] = value;
    });
    return;
  }
  if (Array.isArray(batch)) {
    batch.forEach((quote) => {
      if (quote && quote.symbol) {
        target[quote.symbol] = quote;
      }
    });
    return;
  }
  Object.assign(target, batch);
};

const fetchQuoteMap = async (symbols) => {
  if (!symbols.length) {
    return {};
  }

  const chunks = chunkSymbols(symbols, QUOTE_BATCH_SIZE);
  const quotes = {};

  for (const chunk of chunks) {
    const batch = await yahooFinance.quote(chunk, {
      return: 'object',
      fields: ['symbol', 'regularMarketPrice', 'regularMarketChangePercent'],
    });
    mergeQuoteBatch(quotes, batch);
  }

  return quotes;
};

router.get('/index/:index', async (req, res) => {
  const { index } = req.params;
  const { suffix } = req.query;

  if (!index || !suffix) {
    return res.status(400).json({ message: 'Index and suffix are required.' });
  }

  if (!['NS', 'BO'].includes(suffix)) {
    return res.status(400).json({ message: 'Invalid suffix. Use NS or BO.' });
  }

  const normalizedIndex = index.replace(/[^a-z0-9_]/gi, '').toLowerCase();
  const cacheKey = buildCacheKey('index', normalizedIndex, suffix);
  const marketOpen = isIndianMarketOpen();
  const cached = marketOpen ? getCachedResponse(cacheKey) : getStaleResponse(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }
  if (!marketOpen) {
    const guardKey = `index:${cacheKey}`;
    if (!canAttemptClosedFetch(guardKey)) {
      return res.status(503).json({ message: 'Market closed. Cached data not available yet.' });
    }
    markClosedFetchAttempt(guardKey);
  }

  try {
    const constituents = await getIndexConstituents(normalizedIndex);

    if (!constituents || !constituents.length) {
      return res.status(404).json({ message: `No constituents found for ${index}` });
    }

    const symbols = constituents
      .map((row) => row.symbol)
      .filter(Boolean)
      .map((symbol) => `${symbol}.${suffix}`);
    const quoteMap = await fetchQuoteMap(symbols);

    const stocks = await Promise.all(
      constituents.map(async (row) => {
        const symbol = row.symbol;
        if (!symbol) return null;

        const symbolKey = `${symbol}.${suffix}`;
        const quote =
          quoteMap[symbolKey] ||
          quoteMap[symbolKey.toUpperCase()] ||
          quoteMap[symbolKey.toLowerCase()];

        const logoUrl = row.website ? await fetchCompanyLogo(row.website) : null;

        return {
          symbol,
          suffix,
          name: row.name || 'Unknown',
          price: quote?.regularMarketPrice ?? null,
          change: quote?.regularMarketChangePercent ?? null,
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

    setCachedResponse(cacheKey, filteredStocks);
    res.status(200).json(filteredStocks);
  } catch (error) {
    console.error('Error fetching index stocks:', error);
    const stale = getStaleResponse(cacheKey);
    if (stale) {
      return res.status(200).json(stale);
    }
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
    const normalizedSector = formattedSector.trim().toLowerCase();
    const cacheKey = buildCacheKey('sector', normalizedSector, suffix);
    const marketOpen = isIndianMarketOpen();
    const cached = marketOpen ? getCachedResponse(cacheKey) : getStaleResponse(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const sectorStocks = getSectorStocks(formattedSector, suffix);

    if (!sectorStocks.length) {
      return res.status(404).json({ message: `No stocks found for sector ${formattedSector}` });
    }

    if (!marketOpen) {
      const guardKey = `sector:${cacheKey}`;
      if (!canAttemptClosedFetch(guardKey)) {
        return res.status(503).json({ message: 'Market closed. Cached data not available yet.' });
      }
      markClosedFetchAttempt(guardKey);
    }

    const symbols = sectorStocks
      .map((stock) => stock.symbol)
      .filter(Boolean)
      .map((symbol) => `${symbol}.${suffix}`);
    const quoteMap = await fetchQuoteMap(symbols);

    const stocks = await Promise.all(
      sectorStocks.map(async (stock) => {
        const symbolKey = `${stock.symbol}.${suffix}`;
        const quote =
          quoteMap[symbolKey] ||
          quoteMap[symbolKey.toUpperCase()] ||
          quoteMap[symbolKey.toLowerCase()];
        const logoUrl = stock.website ? await fetchCompanyLogo(stock.website) : null;

        return {
          symbol: stock.symbol,
          suffix,
          name: stock.name,
          price: quote?.regularMarketPrice ?? null,
          change: quote?.regularMarketChangePercent ?? null,
          sector: stock.sector,
          website: stock.website || null,
          logo: logoUrl || null,
        };
      })
    );

    const filteredStocks = stocks.filter(
      (stock) => stock && stock.price !== null && stock.change !== null
    );

    if (!filteredStocks.length) {
      return res.status(404).json({ message: 'No valid stocks found.' });
    }

    setCachedResponse(cacheKey, filteredStocks);
    res.status(200).json(filteredStocks);
  } catch (error) {
    console.error('Error fetching stocks by sector:', error);
    const formattedSector = formatSectorName(req.params.sector);
    const normalizedSector = formattedSector.trim().toLowerCase();
    const cacheKey = buildCacheKey('sector', normalizedSector, req.query.suffix);
    const stale = getStaleResponse(cacheKey);
    if (stale) {
      return res.status(200).json(stale);
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
