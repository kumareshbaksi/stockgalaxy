const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const { Readable } = require('stream');
const cron = require('node-cron');
const AdmZip = require('adm-zip');
const bseStocks = require('../data/bse-stocks.json');

const CACHE_DIR = process.env.MARKET_DATA_CACHE_DIR || path.join(__dirname, '..', 'data', 'market-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'market-data.json');
const MARKET_DATA_TIMEZONE = process.env.MARKET_DATA_TIMEZONE || 'Asia/Kolkata';
const MARKET_DATA_CRON = process.env.MARKET_DATA_CRON || '0 16 * * 1-5';
const LOOKBACK_DAYS = Number.parseInt(process.env.MARKET_DATA_LOOKBACK_DAYS || '10', 10) || 10;
const HISTORY_MAX_DAYS = Number.parseInt(process.env.MARKET_DATA_HISTORY_MAX_DAYS || '0', 10) || 0;

const NSE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://www.nseindia.com/',
  'Accept': 'application/json,text/csv;q=0.9,*/*;q=0.8',
};

const NSE_BHAVCOPY_URL_TEMPLATE =
  process.env.NSE_BHAVCOPY_URL_TEMPLATE ||
  'https://nsearchives.nseindia.com/content/historical/EQUITIES/{YYYY}/{MMM}/cm{DD}{MMM}{YYYY}bhav.csv.zip';

const BSE_BHAVCOPY_URL_TEMPLATES = [
  process.env.BSE_BHAVCOPY_URL_TEMPLATE,
  'https://www.bseindia.com/download/BhavCopy/Equity/EQ{DD}{MM}{YY}_CSV.ZIP',
  'https://static.bseindia.com/download/BhavCopy/Equity/EQ{DD}{MM}{YY}_CSV.ZIP',
].filter(Boolean);

const NSE_INDICES_URL =
  process.env.NSE_INDICES_URL || 'https://www.nseindia.com/api/allIndices';

const SENSEX_INDEX_URLS = [
  process.env.SENSEX_INDEX_URL,
  'https://api.bseindia.com/BseIndiaAPI/api/IndexSensexData/w',
  'https://api.bseindia.com/BseIndiaAPI/api/GetSensexData/w',
  'https://www.bseindia.com/BseIndiaAPI/api/IndexSensexData/w',
  'https://www.bseindia.com/BseIndiaAPI/api/GetSensexData/w',
].filter(Boolean);

const defaultCache = () => ({
  updatedAt: null,
  nse: { asOf: null, quotes: {}, history: {} },
  bse: { asOf: null, quotes: {}, history: {} },
  indices: {},
});

let cache = defaultCache();
let refreshPromise = null;

const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();
const normalizeNameKey = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/\b(LTD|LIMITED|LTD\.|PVT|PRIVATE|CO|CORP|CORPORATION|INC|INDIA|INDIAN)\b/g, '')
    .replace(/[^A-Z0-9]/g, '');

const buildUniqueNameMap = (stocks) => {
  const map = new Map();
  const collisions = new Set();
  stocks.forEach((stock) => {
    const key = normalizeNameKey(stock.name);
    if (!key) return;
    if (map.has(key)) {
      collisions.add(key);
      return;
    }
    map.set(key, normalizeSymbol(stock.symbol));
  });
  collisions.forEach((key) => map.delete(key));
  return map;
};

const bseNameMap = buildUniqueNameMap(bseStocks);

const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthShort = (date) =>
  date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();

const applyDateTemplate = (template, date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const monthShort = formatMonthShort(date);
  return template
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{YY\}/g, String(year).slice(-2))
    .replace(/\{MM\}/g, month)
    .replace(/\{DD\}/g, day)
    .replace(/\{MMM\}/g, monthShort);
};

const getDateInTimeZone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || date.getUTCFullYear());
  const month = Number(parts.find((part) => part.type === 'month')?.value || date.getUTCMonth() + 1);
  const day = Number(parts.find((part) => part.type === 'day')?.value || date.getUTCDate());
  return new Date(Date.UTC(year, month - 1, day));
};

const MONTHS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const parseNseTimestamp = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = MONTHS[match[2].toUpperCase()];
  const year = Number.parseInt(match[3], 10);
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return null;
  }
  return new Date(Date.UTC(year, month, day));
};

const fetchNseBaseDate = async () => {
  const response = await axios.get(NSE_INDICES_URL, {
    headers: NSE_HEADERS,
    timeout: 15000,
  });
  return parseNseTimestamp(response.data?.timestamp || response.data?.time || '');
};

const resolveBaseDate = async () => {
  const override = process.env.MARKET_DATA_BASE_DATE;
  if (override) {
    const parsed = new Date(`${override}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  try {
    const remoteDate = await fetchNseBaseDate();
    if (remoteDate) {
      return remoteDate;
    }
  } catch (error) {
    console.error('Failed to resolve NSE base date:', error.message);
  }
  return getDateInTimeZone(new Date(), MARKET_DATA_TIMEZONE);
};

const shiftDate = (date, days) => {
  const shifted = new Date(date.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
};

const parseCsvBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer.toString('utf8'))
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });

const fetchZipCsvRows = async (url, headers = {}) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers,
    timeout: 20000,
  });
  const zip = new AdmZip(response.data);
  const entries = zip.getEntries();
  if (!entries.length) {
    throw new Error(`Empty zip from ${url}`);
  }
  const csvBuffer = entries[0].getData();
  return parseCsvBuffer(csvBuffer);
};

const findLatestDataset = async (fetcher, baseDate, lookbackDays) => {
  for (let offset = 0; offset <= lookbackDays; offset += 1) {
    const targetDate = shiftDate(baseDate, -offset);
    try {
      const rows = await fetcher(targetDate);
      return { rows, date: targetDate };
    } catch (error) {
      const status = error?.response?.status;
      if (status && status !== 404) {
        throw error;
      }
    }
  }
  throw new Error('No dataset found in lookback window.');
};

const fetchNseBhavcopy = async (date) => {
  const url = applyDateTemplate(NSE_BHAVCOPY_URL_TEMPLATE, date);
  const rows = await fetchZipCsvRows(url, NSE_HEADERS);
  return rows;
};

const fetchBseBhavcopy = async (date) => {
  let lastError = null;
  for (const template of BSE_BHAVCOPY_URL_TEMPLATES) {
    const url = applyDateTemplate(template, date);
    try {
      const rows = await fetchZipCsvRows(url, { 'User-Agent': NSE_HEADERS['User-Agent'] });
      return rows;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('BSE bhavcopy fetch failed.');
};

const resolveBseSymbol = (row) => {
  const explicitSymbol = normalizeSymbol(
    row.SYMBOL ||
      row['SYMBOL'] ||
      row.SCRIP ||
      row['SCRIP'] ||
      row.Scrip ||
      row['SC_SYMBOL'] ||
      row['SC SYMBOL']
  );
  if (explicitSymbol) {
    return explicitSymbol;
  }
  const nameKey = normalizeNameKey(
    row.SC_NAME ||
      row['SC_NAME'] ||
      row['SC NAME'] ||
      row.SCRIP_NAME ||
      row['SCRIP_NAME'] ||
      row['SCRIP NAME']
  );
  return bseNameMap.get(nameKey) || null;
};

const upsertHistory = (history, dateKey, close) => {
  if (close === null) return;
  if (!history || !Array.isArray(history)) {
    history = [];
  }
  const last = history[history.length - 1];
  if (last && last.date === dateKey) {
    last.close = close;
    return history;
  }
  if (!last || dateKey > last.date) {
    history.push({ date: dateKey, close });
    if (HISTORY_MAX_DAYS > 0 && history.length > HISTORY_MAX_DAYS) {
      history.splice(0, history.length - HISTORY_MAX_DAYS);
    }
    return history;
  }
  const existingIndex = history.findIndex((entry) => entry.date === dateKey);
  if (existingIndex >= 0) {
    history[existingIndex].close = close;
    return history;
  }
  history.push({ date: dateKey, close });
  history.sort((a, b) => a.date.localeCompare(b.date));
  if (HISTORY_MAX_DAYS > 0 && history.length > HISTORY_MAX_DAYS) {
    history.splice(0, history.length - HISTORY_MAX_DAYS);
  }
  return history;
};

const buildQuotesFromNse = (rows, dateKey) => {
  const quotes = {};
  rows.forEach((row) => {
    const series = String(row.SERIES || row.Series || '').trim().toUpperCase();
    if (series && series !== 'EQ') return;
    const symbol = normalizeSymbol(row.SYMBOL || row.Symbol);
    if (!symbol) return;
    const close = parseNumber(row.CLOSE || row.Close);
    const prevClose = parseNumber(row.PREVCLOSE || row['PREVCLOSE'] || row.PrevClose);
    if (close === null) return;
    const change = prevClose !== null ? close - prevClose : null;
    const changePercent =
      prevClose && prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : null;
    quotes[symbol] = {
      symbol,
      close,
      prevClose,
      change,
      changePercent,
      asOf: dateKey,
    };
  });
  return quotes;
};

const buildQuotesFromBse = (rows, dateKey) => {
  const quotes = {};
  rows.forEach((row) => {
    const symbol = resolveBseSymbol(row);
    if (!symbol) return;
    const close = parseNumber(row.CLOSE || row.Close);
    const prevClose = parseNumber(row.PREVCLOSE || row['PREV_CLOSE'] || row.PrevClose);
    if (close === null) return;
    const change = prevClose !== null ? close - prevClose : null;
    const changePercent =
      prevClose && prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : null;
    quotes[symbol] = {
      symbol,
      close,
      prevClose,
      change,
      changePercent,
      asOf: dateKey,
    };
  });
  return quotes;
};

const ensureCacheDir = async () => {
  await fs.mkdir(CACHE_DIR, { recursive: true });
};

const loadCache = async () => {
  if (!fsSync.existsSync(CACHE_FILE)) {
    return;
  }
  const raw = await fs.readFile(CACHE_FILE, 'utf8');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    cache = defaultCache();
    cache.updatedAt = parsed.updatedAt || null;
    if (parsed.nse) {
      cache.nse.asOf = parsed.nse.asOf || null;
      cache.nse.quotes = parsed.nse.quotes || {};
      cache.nse.history = parsed.nse.history || {};
    }
    if (parsed.bse) {
      cache.bse.asOf = parsed.bse.asOf || null;
      cache.bse.quotes = parsed.bse.quotes || {};
      cache.bse.history = parsed.bse.history || {};
    }
    cache.indices = parsed.indices || {};
  } catch (error) {
    console.error('Failed to parse market data cache:', error.message);
  }
};

const persistCache = async () => {
  await ensureCacheDir();
  const tmpFile = `${CACHE_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(cache));
  await fs.rename(tmpFile, CACHE_FILE);
};

const updateHistoryFromQuotes = (history, quotes, dateKey) => {
  Object.values(quotes).forEach((quote) => {
    history[quote.symbol] = upsertHistory(history[quote.symbol], dateKey, quote.close);
  });
};

const refreshNseData = async (baseDate) => {
  const { rows, date } = await findLatestDataset(fetchNseBhavcopy, baseDate, LOOKBACK_DAYS);
  const dateKey = formatDateKey(date);
  const quotes = buildQuotesFromNse(rows, dateKey);
  if (Object.keys(quotes).length) {
    cache.nse.quotes = quotes;
    cache.nse.asOf = dateKey;
    updateHistoryFromQuotes(cache.nse.history, quotes, dateKey);
  }
};

const refreshBseData = async (baseDate) => {
  const { rows, date } = await findLatestDataset(fetchBseBhavcopy, baseDate, LOOKBACK_DAYS);
  const dateKey = formatDateKey(date);
  const quotes = buildQuotesFromBse(rows, dateKey);
  if (Object.keys(quotes).length) {
    cache.bse.quotes = quotes;
    cache.bse.asOf = dateKey;
    updateHistoryFromQuotes(cache.bse.history, quotes, dateKey);
  }
};

const parseSensexRow = (row) => {
  if (!row) return null;
  const price =
    parseNumber(
      row.last ||
        row.Last ||
        row.indexValue ||
        row.currentValue ||
        row.current ||
        row.ltp ||
        row.value
    ) || null;
  let change =
    parseNumber(row.variation || row.change || row.netChange || row.Change || row.chg) || null;
  let changePercent =
    parseNumber(row.percentChange || row.changePercent || row.pChange || row['change%']) || null;
  if ((change === null || changePercent === null) && row.prevClose) {
    const prevClose = parseNumber(row.prevClose);
    if (prevClose && price !== null) {
      change = price - prevClose;
      changePercent = (change / prevClose) * 100;
    }
  }
  if (price === null) return null;
  return {
    symbol: 'SENSEX',
    name: 'SENSEX',
    price,
    change,
    changePercent,
  };
};

const extractSensexPayload = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0];
  if (Array.isArray(payload.Sensex)) return payload.Sensex[0];
  if (Array.isArray(payload.sensex)) return payload.sensex[0];
  if (Array.isArray(payload.data)) {
    return (
      payload.data.find((row) => /sensex/i.test(row.index || row.name || row.symbol)) ||
      payload.data[0]
    );
  }
  if (Array.isArray(payload.Table)) return payload.Table[0];
  return payload;
};

const fetchSensexSnapshot = async () => {
  for (const url of SENSEX_INDEX_URLS) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': NSE_HEADERS['User-Agent'],
          'Referer': 'https://www.bseindia.com',
          'Accept': 'application/json,text/plain,*/*',
        },
        timeout: 15000,
      });
      const row = extractSensexPayload(response.data);
      const parsed = parseSensexRow(row);
      if (parsed) return parsed;
    } catch (error) {
      continue;
    }
  }
  return null;
};

const fetchNseIndices = async () => {
  const response = await axios.get(NSE_INDICES_URL, {
    headers: NSE_HEADERS,
    timeout: 15000,
  });
  const rows = response.data?.data || [];
  const mapRow = (row) => ({
    symbol: row.indexSymbol || row.index || row.symbol,
    name: row.index || row.indexSymbol || row.symbol,
    price: parseNumber(row.last),
    change: parseNumber(row.variation),
    changePercent: parseNumber(row.percentChange),
  });
  const niftyRow = rows.find((row) => row.index === 'NIFTY 50') || null;
  const bankRow = rows.find((row) => row.index === 'NIFTY BANK') || null;
  return {
    nifty50: niftyRow ? mapRow(niftyRow) : null,
    banknifty: bankRow ? mapRow(bankRow) : null,
  };
};

const refreshIndexData = async () => {
  try {
    const nseIndices = await fetchNseIndices();
    const updates = {};
    if (nseIndices.nifty50) updates.nifty50 = nseIndices.nifty50;
    if (nseIndices.banknifty) updates.banknifty = nseIndices.banknifty;
    const sensex = await fetchSensexSnapshot();
    if (sensex) {
      updates.sensex = sensex;
    }
    if (Object.keys(updates).length) {
      cache.indices = { ...cache.indices, ...updates };
    }
  } catch (error) {
    console.error('Failed to refresh index data:', error.message);
  }
};

const refreshMarketData = async (options = {}) => {
  if (refreshPromise) return refreshPromise;
  const baseDate = await resolveBaseDate();
  refreshPromise = (async () => {
    const tasks = [
      refreshNseData(baseDate),
      refreshBseData(baseDate),
      refreshIndexData(),
    ];
    const results = await Promise.allSettled(tasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Market data refresh error:', result.reason?.message || result.reason);
      }
    });
    cache.updatedAt = new Date().toISOString();
    await persistCache();
    return options;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

const initializeMarketData = async () => {
  await loadCache();
  refreshMarketData({ reason: 'startup' }).catch((error) => {
    console.error('Initial market data refresh failed:', error.message);
  });
  cron.schedule(
    MARKET_DATA_CRON,
    () => {
      refreshMarketData({ reason: 'cron' }).catch((error) => {
        console.error('Scheduled market data refresh failed:', error.message);
      });
    },
    { timezone: MARKET_DATA_TIMEZONE }
  );
};

const getMarketBucket = (suffix) => (suffix === 'BO' ? cache.bse : cache.nse);

const hasQuotes = (bucket) => Object.keys(bucket?.quotes || {}).length > 0;

const hasIndices = () => Object.keys(cache.indices || {}).length > 0;

const ensureMarketData = async ({ suffix, requireIndices = false } = {}) => {
  const bucketReady = suffix ? hasQuotes(getMarketBucket(suffix)) : hasQuotes(cache.nse) || hasQuotes(cache.bse);
  const indexReady = !requireIndices || hasIndices();
  if (bucketReady && indexReady) {
    return;
  }
  try {
    await refreshMarketData({ reason: 'on-demand' });
  } catch (error) {
    console.error('On-demand market data refresh failed:', error.message);
  }
};

const getQuote = (symbol, suffix) => {
  const key = normalizeSymbol(symbol);
  if (!key) return null;
  const bucket = getMarketBucket(suffix);
  return bucket.quotes[key] || null;
};

const getQuoteMap = (symbols, suffix) => {
  const bucket = getMarketBucket(suffix);
  const quotes = {};
  symbols.forEach((symbol) => {
    const key = normalizeSymbol(symbol);
    if (!key) return;
    const quote = bucket.quotes[key];
    if (quote) {
      quotes[key] = quote;
    }
  });
  return quotes;
};

const getHistory = (symbol, suffix, startDate) => {
  const key = normalizeSymbol(symbol);
  if (!key) return [];
  const bucket = getMarketBucket(suffix);
  const history = bucket.history[key] || [];
  if (!startDate) return history;
  const startKey = formatDateKey(startDate);
  return history.filter((entry) => entry.date >= startKey);
};

const getIndexSnapshot = (indexName) => {
  if (!indexName) return null;
  const key = indexName.toLowerCase();
  return cache.indices[key] || null;
};

module.exports = {
  initializeMarketData,
  refreshMarketData,
  ensureMarketData,
  getQuote,
  getQuoteMap,
  getHistory,
  getIndexSnapshot,
};
