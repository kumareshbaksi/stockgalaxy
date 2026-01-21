const express = require("express");
const { shouldForceRefresh } = require("../utils/cacheRefreshAuth");
const { ensureMarketData, getIndexSnapshot, refreshMarketData } = require("../utils/marketDataService");

const router = express.Router();

const LIVE_INDEX_CACHE_TTL_MS =
  Number.parseInt(
    process.env.LIVE_INDEX_CACHE_TTL_MS || process.env.QUOTE_CACHE_TTL_MS || "3600000",
    10
  ) || 3600000;
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

const safeNumber = (value) => (Number.isFinite(value) ? value : 0);

// Endpoint: /api/live-index/:indexName
router.get("/live-index/:indexName", async (req, res) => {
  const { indexName } = req.params;

  const indexKeys = {
    nifty50: "nifty50",
    sensex: "sensex",
    banknifty: "banknifty",
  };

  const indexKey = indexKeys[indexName.toLowerCase()];
  if (!indexKey) {
    return res.status(400).json({ error: "Invalid index name provided." });
  }

  const cacheKey = indexKey;
  const forceRefresh = shouldForceRefresh(req);
  const cached = getCachedIndex(cacheKey);
  if (cached && !forceRefresh) {
    return res.json(cached);
  }

  try {
    if (forceRefresh) {
      await refreshMarketData({ reason: "force" });
    }
    await ensureMarketData({ requireIndices: true });
  } catch (error) {
    console.error(`Error refreshing index data for ${indexName}:`, error.message);
  }

  try {
    // Fetch the cached index data from the market data service.
    const indexData = getIndexSnapshot(indexKey);

    const payload = {
      symbol: indexData?.symbol || indexKey.toUpperCase(),
      name: indexData?.name || "Unknown Index",
      price: safeNumber(indexData?.price),
      change: safeNumber(indexData?.change),
      changePercent: safeNumber(indexData?.changePercent),
    };

    if (indexData) {
      setCachedIndex(cacheKey, payload);
    }
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
