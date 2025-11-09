const express = require('express');
const nseStocks = require('../data/nse-stocks.json');
const bseStocks = require('../data/bse-stocks.json');

const router = express.Router();

// Endpoint to fetch unique sectors.
router.get('/sectors', async (req, res) => {
    try {
        const sectors = new Set();
        [...nseStocks, ...bseStocks].forEach((stock) => {
            const sector = (stock.sector || '').trim();
            if (sector) {
                sectors.add(sector);
            }
        });

        res.status(200).json({ sectors: Array.from(sectors).sort() });
    } catch (error) {
        console.error('Error fetching sectors:', error);
        res.status(500).json({ message: 'Error fetching sectors' });
    }
});

module.exports = router;
