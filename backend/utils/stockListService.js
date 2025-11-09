const axios = require('axios');
const csv = require('csv-parser');
const uniqueStocksFallback = require('../data/unique-stocks.json');

const NSE_STOCK_LIST_URL = process.env.NSE_STOCK_LIST_URL ||
    'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const BSE_STOCK_LIST_URL = process.env.BSE_STOCK_LIST_URL ||
    'https://static.bseindia.com/download/BhavCopy/Equity/EQ_ISINCODE.csv';
const STOCK_CACHE_TTL_MS = parseInt(process.env.STOCK_CACHE_TTL_MS || 60 * 60 * 1000, 10);

const NSE_REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.nseindia.com/',
    'Accept': 'text/csv,application/octet-stream;q=0.9,*/*;q=0.8',
};

let stockCache = {
    data: null,
    expiresAt: 0,
};

const parseCsvStream = (stream) =>
    new Promise((resolve, reject) => {
        const rows = [];
        stream
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', (error) => reject(error));
    });

const fetchCsvDataset = async (url, headers = {}) => {
    const response = await axios.get(url, {
        responseType: 'stream',
        headers,
        timeout: 15000,
    });
    return parseCsvStream(response.data);
};

const normalizeStockRecord = (symbol, companyName) => {
    if (!symbol || !companyName) {
        return null;
    }

    const cleanedSymbol = String(symbol).trim();
    const cleanedName = String(companyName).trim();

    if (!cleanedSymbol || !cleanedName) {
        return null;
    }

    return {
        symbol: cleanedSymbol,
        companyName: cleanedName,
    };
};

const mapNseRows = (rows) =>
    rows
        .map((row) =>
            normalizeStockRecord(
                row.SYMBOL,
                row['NAME OF COMPANY'] || row.NAME || row['NAME']
            )
        )
        .filter(Boolean);

const mapBseRows = (rows) =>
    rows
        .map((row) =>
            normalizeStockRecord(
                row.SYMBOL || row.SC_CODE || row['SC_CODE'] || row.SYNBOL,
                row['NAME OF COMPANY'] || row.NAME || row['SC_NAME']
            )
        )
        .filter(Boolean);

const dedupeStocks = (stocks) => {
    const uniqueMap = new Map();
    stocks.forEach((stock) => {
        if (!uniqueMap.has(stock.symbol)) {
            uniqueMap.set(stock.symbol, stock);
        }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
};

const fetchDynamicStockList = async () => {
    const [nseResult, bseResult] = await Promise.allSettled([
        fetchCsvDataset(NSE_STOCK_LIST_URL, NSE_REQUEST_HEADERS).then(mapNseRows),
        fetchCsvDataset(BSE_STOCK_LIST_URL).then(mapBseRows),
    ]);

    const stocks = [];

    if (nseResult.status === 'fulfilled') {
        stocks.push(...nseResult.value);
    } else {
        console.error('Failed to fetch NSE stock list:', nseResult.reason?.message || nseResult.reason);
    }

    if (bseResult.status === 'fulfilled') {
        stocks.push(...bseResult.value);
    } else {
        console.error('Failed to fetch BSE stock list:', bseResult.reason?.message || bseResult.reason);
    }

    return stocks;
};

const getStockList = async () => {
    const now = Date.now();
    if (stockCache.data && stockCache.expiresAt > now) {
        return stockCache.data;
    }

    let stocks = [];
    try {
        stocks = await fetchDynamicStockList();
    } catch (error) {
        console.error('Failed to fetch remote stock list:', error.message);
    }

    const uniqueStocks = stocks.length ? dedupeStocks(stocks) : uniqueStocksFallback;
    stockCache = {
        data: uniqueStocks,
        expiresAt: now + STOCK_CACHE_TTL_MS,
    };

    return uniqueStocks;
};

module.exports = {
    getStockList,
};
