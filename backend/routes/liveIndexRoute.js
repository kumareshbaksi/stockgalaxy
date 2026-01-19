const express = require("express");
const yahooFinance = require("yahoo-finance2").default;
const { isIndianMarketOpen } = require("../utils/marketHours");
const { canAttemptClosedFetch, markClosedFetchAttempt } = require("../utils/closedFetchGuard");

const router = express.Router();

const LIVE_INDEX_CACHE_TTL_MS =
  Number.parseInt(
    process.env.LIVE_INDEX_CACHE_TTL_MS || process.env.QUOTE_CACHE_TTL_MS || "15000",
    10
  ) || 15000;
const liveIndexCache = new Map();

const getCachedIndex = (key) => {
  const entry = liveIndexCache.get(key);
  if (!entry) {
    return null;
  }
  return entry.expiresAt > Date.now() ? entry.data : null;
};

const getStaleIndex = (key) => {
  const entry = liveIndexCache.get(key);
  return entry ? entry.data : null;
};

const setCachedIndex = (key, data) => {
  liveIndexCache.set(key, {
    data,
    expiresAt: Date.now() + LIVE_INDEX_CACHE_TTL_MS,
  });
};

// Endpoint: /api/live-index/:indexName
router.get("/live-index/:indexName", async (req, res) => {
  const { indexName } = req.params;

  // Mapping indexName to Yahoo Finance index symbols
  const indexSymbols = {
    nifty50: "^NSEI",      // Yahoo Finance symbol for NIFTY 50
    sensex: "^BSESN",      // Yahoo Finance symbol for SENSEX
    banknifty: "^NSEBANK", // Yahoo Finance symbol for Bank NIFTY
  };

  const yahooIndexSymbol = indexSymbols[indexName.toLowerCase()];
  if (!yahooIndexSymbol) {
    return res.status(400).json({ error: "Invalid index name provided." });
  }

  const cacheKey = indexName.toLowerCase();
  const marketOpen = isIndianMarketOpen();
  const cached = marketOpen ? getCachedIndex(cacheKey) : getStaleIndex(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  if (!marketOpen) {
    const guardKey = `live-index:${cacheKey}`;
    if (!canAttemptClosedFetch(guardKey)) {
      return res.status(503).json({ error: "Market closed. Cached data not available yet." });
    }
    markClosedFetchAttempt(guardKey);
  }

  try {
    // Fetch the live index data from Yahoo Finance
    const indexData = await yahooFinance.quote(yahooIndexSymbol, {
      fields: [
        "symbol",
        "shortName",
        "longName",
        "regularMarketPrice",
        "regularMarketChange",
        "regularMarketChangePercent",
      ],
    });

    // Send the live index data as a response
    const payload = {
      symbol: indexData.symbol,
      name: indexData.longName || indexData.shortName || "Unknown Index",
      price: indexData.regularMarketPrice,
      change: indexData.regularMarketChange,
      changePercent: indexData.regularMarketChangePercent,
    };
    setCachedIndex(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error(`Error fetching live index data for ${indexName}:`, error.message);
    const stale = getStaleIndex(cacheKey);
    if (stale) {
      return res.json(stale);
    }
    res.status(500).json({ error: `Failed to fetch live index data for ${indexName}.` });
  }
});

module.exports = router;
