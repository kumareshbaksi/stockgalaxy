const express = require('express');
const xlsx = require('xlsx');
const path = require('path');

const router = express.Router();

// Endpoint to fetch unique sectors.
router.get('/sectors', async (req, res) => {
    try {
        // Load the Excel file.
        const filePath = path.join(__dirname, '../file/NSE.xlsx');
        const workbook = xlsx.readFile(filePath);

        // Assume data is in the first sheet.
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Extract unique sectors from the `SECTOR` column.
        const sectors = new Set();
        sheetData.forEach((row) => {
            // Match the column name exactly as in the Excel file.
            if (row.SECTOR) {
                sectors.add(row.SECTOR.trim());
            }
        });

        // Convert the Set to an array and return it.
        res.status(200).json({ sectors: Array.from(sectors).sort() });
    } catch (error) {
        console.error('Error fetching sectors:', error);
        res.status(500).json({ message: 'Error fetching sectors' });
    }
});

module.exports = router;
