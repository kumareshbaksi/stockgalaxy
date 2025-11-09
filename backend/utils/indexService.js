const axios = require('axios');
const csv = require('csv-parser');
const niftyFallback = require('../data/nifty50.json');
const sensexFallback = require('../data/sensex.json');
const bankNiftyFallback = require('../data/banknifty.json');
const nseStocks = require('../data/nse-stocks.json');
const bseStocks = require('../data/bse-stocks.json');

const NSE_INDEX_URL = process.env.NIFTY50_SOURCE_URL ||
    'https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv';
const SENSEX_INDEX_URL = process.env.SENSEX_SOURCE_URL ||
    'https://www.bseindia.com/BseIndiaAPI/api/GetSensexData/w';
const BANK_NIFTY_URL = process.env.BANKNIFTY_SOURCE_URL ||
    'https://nsearchives.nseindia.com/content/indices/ind_niftybanklist.csv';

const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json,text/csv;q=0.9,*/*;q=0.8',
    'Referer': 'https://www.nseindia.com/',
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

const cleanText = (value = '') => String(value || '').trim();

const fetchCsvFromUrl = async (url) => {
    const response = await axios.get(url, {
        responseType: 'stream',
        headers: BASE_HEADERS,
        timeout: 15000,
    });
    return parseCsvStream(response.data);
};

const createLookup = (collection = []) => {
    const map = new Map();
    collection.forEach((item) => {
        if (!item.symbol) return;
        map.set(item.symbol.trim().toUpperCase(), item);
    });
    return map;
};

const nseLookup = createLookup(nseStocks);
const bseLookup = createLookup(bseStocks);
const niftyLookup = createLookup(niftyFallback);
const sensexLookup = createLookup(sensexFallback);
const bankNiftyLookup = createLookup(bankNiftyFallback);

const mapNiftyRows = (rows) =>
    rows
        .map((row) => {
            const symbol = cleanText(row.Symbol || row.SYMBOL);
            const lookup = nseLookup.get(symbol.toUpperCase()) || niftyLookup.get(symbol.toUpperCase());
            return {
                symbol,
                name: cleanText(row['Company Name'] || row.NAME || row['Company Name '] || row['COMPANY NAME'] || lookup?.name),
                sector: cleanText(row.Industry || row.SECTOR || lookup?.sector || 'NIFTY 50'),
                website: cleanText(lookup?.website || ''),
            };
        })
        .filter((row) => row.symbol && row.name);

const mapBankNiftyRows = (rows) =>
    rows
        .map((row) => {
            const symbol = cleanText(row.Symbol || row.SYMBOL);
            const lookup = bankNiftyLookup.get(symbol.toUpperCase()) || nseLookup.get(symbol.toUpperCase());
            return {
                symbol,
                name: cleanText(row['Company Name'] || row.NAME || lookup?.name),
                sector: cleanText(row.Industry || row.SECTOR || lookup?.sector || 'BANK NIFTY'),
                website: cleanText(lookup?.website || ''),
            };
        })
        .filter((row) => row.symbol && row.name);

const flattenJson = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.Sensex)) return payload.Sensex;
    if (Array.isArray(payload.sensex)) return payload.sensex;
    if (Array.isArray(payload.Table)) return payload.Table;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
};

const mapSensexRows = (rows) =>
    rows
        .map((row) => {
            const symbol = cleanText(
                row.symbol ||
                row.SYMBOL ||
                row.sc_code ||
                row.scripcode ||
                row.Scripcode ||
                row.Sc_Code ||
                row.scripSymbol
            );
            const lookup = bseLookup.get(symbol.toUpperCase()) || sensexLookup.get(symbol.toUpperCase()) || nseLookup.get(symbol.toUpperCase());
            return {
                symbol,
                name: cleanText(
                    row.name ||
                    row.NAME ||
                    row.sc_name ||
                    row.scripname ||
                    row.Scrip_Name ||
                    row.CompanyName ||
                    lookup?.name
                ),
                sector: cleanText(row.sector || row.Sector || lookup?.sector || 'SENSEX'),
                website: cleanText(row.URL || lookup?.website || '')
            };
        })
        .filter((row) => row.symbol && row.name);

const fetchNiftyConstituents = async () => {
    try {
        const rows = await fetchCsvFromUrl(NSE_INDEX_URL);
        const mapped = mapNiftyRows(rows);
        if (mapped.length) {
            return mapped;
        }
    } catch (error) {
        console.error('Failed to fetch NIFTY 50 constituents:', error.message);
    }
    return niftyFallback;
};

const fetchSensexConstituents = async () => {
    try {
        const response = await axios.get(SENSEX_INDEX_URL, {
            headers: BASE_HEADERS,
            timeout: 15000,
        });
        const mapped = mapSensexRows(flattenJson(response.data));
        if (mapped.length) {
            return mapped;
        }
    } catch (error) {
        console.error('Failed to fetch SENSEX constituents:', error.message);
    }
    return sensexFallback;
};

const fetchBankNiftyConstituents = async () => {
    try {
        const rows = await fetchCsvFromUrl(BANK_NIFTY_URL);
        const mapped = mapBankNiftyRows(rows);
        if (mapped.length) {
            return mapped;
        }
    } catch (error) {
        console.error('Failed to fetch BANK NIFTY constituents:', error.message);
    }
    return bankNiftyFallback;
};

const INDEX_FETCHERS = {
    nifty50: fetchNiftyConstituents,
    nifty_50: fetchNiftyConstituents,
    nifty: fetchNiftyConstituents,
    sensex: fetchSensexConstituents,
    banknifty: fetchBankNiftyConstituents,
    bank_nifty: fetchBankNiftyConstituents,
    niftybank: fetchBankNiftyConstituents,
};

const getIndexConstituents = async (indexKey) => {
    const normalizedKey = (indexKey || '').toLowerCase();
    const fetcher = INDEX_FETCHERS[normalizedKey];

    if (!fetcher) {
        throw new Error(`Unsupported index: ${indexKey}`);
    }

    return fetcher();
};

module.exports = {
    getIndexConstituents,
};
