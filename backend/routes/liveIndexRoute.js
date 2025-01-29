const express = require("express");
const yahooFinance = require("yahoo-finance2").default;

const router = express.Router();

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

  try {
    // Fetch the live index data from Yahoo Finance
    const indexData = await yahooFinance.quote(yahooIndexSymbol);

    // Send the live index data as a response
    res.json({
      symbol: indexData.symbol,
      name: indexData.longName || indexData.shortName || "Unknown Index",
      price: indexData.regularMarketPrice,
      change: indexData.regularMarketChange,
      changePercent: indexData.regularMarketChangePercent,
    });
  } catch (error) {
    console.error(`Error fetching live index data for ${indexName}:`, error.message);
    res.status(500).json({ error: `Failed to fetch live index data for ${indexName}.` });
  }
});

module.exports = router;
