const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const User = require("../models/User");
const yahooFinance = require("yahoo-finance2").default;
const fetchCompanyLogo = require("../utils/fetchCompanyLogo");
const xlsx = require("xlsx");
const path = require("path");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Utility to read NSE.xlsx and map symbols to their domains.
const getStockDomainsWithURL = (filePath) => {
  try {
    // Read the Excel file.
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Create a mapping of SYMBOL to URL.
    const stockDomains = {};
    sheetData.forEach((row) => {
      if (row.SYMBOL && row.URL) {
        stockDomains[row.SYMBOL.trim()] = row.URL.trim();
      }
    });

    return stockDomains;
  } catch (error) {
    console.error("Error reading NSE.xlsx file:", error.message);
    throw error;
  }
};

router.post("/portfolio/create", verifyToken, async (req, res) => {
  const { name, stocks } = req.body;

  // Check if portfolio name is provided.
  if (!name) {
    return res.status(400).json({ message: "Portfolio name is required." });
  }

  try {
    // Fetch the user by ID.
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Create the new portfolio object.
    const newPortfolio = {
      name,
      stocks: stocks.map((symbol) => ({ symbol })),
    };

    // Add the new portfolio and save the user document.
    user.portfolios.push(newPortfolio);
    await user.save();

    // Retrieve the newly added portfolio.
    const createdPortfolio = user.portfolios[user.portfolios.length - 1];

    // Respond with success.
    res.status(201).json({
      message: "Portfolio created successfully",
      portfolio: {
        id: createdPortfolio._id,
        name: createdPortfolio.name,
        stocks: createdPortfolio.stocks,
        stockCount: createdPortfolio.stocks.length,
        updatedAt: createdPortfolio.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/portfolio/update", verifyToken, async (req, res) => {
  // Only expect 'stocks' in the body.
  const { stocks } = req.body;
  // Get 'id' from query parameters.
  const { portfolioid: portfolioId } = req.query;

  // Validate input
  if (!portfolioId || !stocks || !Array.isArray(stocks)) {
    return res.status(400).json({
      message:
        "Portfolio ID (in query) and an array of symbols (in body) are required.",
    });
  }

  try {
    // Find the user.
    const user = await User.findById(req.userId);
    // Get the specific portfolio.
    const portfolio = user.portfolios.id(portfolioId);

    // Check if portfolio exists.
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found." });
    }

    // Update stocks.
    portfolio.stocks = stocks.map((symbol) => ({ symbol }));
    // Save changes to the database.
    await user.save();

    // Respond with success.
    res.status(200).json({
      message: "Portfolio updated successfully",
      portfolio,
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/portfolio/stocks", verifyToken, async (req, res) => {
  try {
    // Extract 'portfolioid' and 'suffix' from query params.
    var { portfolioid, suffix = "NS" } = req.query;

    // Validate portfolio ID.
    if (!portfolioid) {
      return res.status(400).json({ message: "Portfolio ID is required." });
    }

    if (suffix === "BSE") {
      suffix = "BO";
    } else if (suffix === "NSE") {
      suffix = "NS";
    }

    // Find user by ID.
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Find the specified portfolio.
    const portfolio = user.portfolios.id(portfolioid);
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found." });
    }

    // Adjust the number of stocks based on the plan
    const stocksToProcess = portfolio.stocks;

    // Load stock domains from NSE.xlsx
    const stockDomains = getStockDomainsWithURL(
      path.join(__dirname, "../file/NSE.xlsx")
    );

    // Enrich stock data
    const enrichedStocks = await Promise.all(
      stocksToProcess.map(async (stock) => {
        try {
          // Extract symbol from stock object.
          const { symbol } = stock;

          // Fetch stock data from Yahoo Finance.
          const stockData = await yahooFinance.quote(`${symbol}.${suffix}`);

          // Get domain and logo for the stock.
          const domain = stockDomains[symbol];
          const logoUrl = domain ? await fetchCompanyLogo(domain) : null;

          return {
            symbol: symbol,
            name:
              stockData.longName || stockData.shortName || "Unknown Company",
            price: stockData.regularMarketPrice,
            change: stockData.regularMarketChange,
            suffix: suffix,
            changePercent: stockData.regularMarketChangePercent,
            logo: logoUrl,
          };
        } catch (error) {
          console.error(
            `Error fetching data for stock ${stock.symbol}:`,
            error.message
          );
          return {
            symbol: stock.symbol,
            error: `Failed to fetch details for ${stock.symbol}`,
          };
        }
      })
    );

    // Return enriched stock data.
    res.status(200).json({
      message: "Portfolio fetched successfully",
      portfolioName: portfolio.name,
      stocks: enrichedStocks,
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Endpoint to check if the user is logged in.
router.get("/status", async (req, res) => {
  try {
    // Extract the token from the cookies
    const token = req.cookies.authToken;

    if (!token) {
      return res
        .status(200)
        .json({ isLoggedIn: false, message: "User is not logged in" });
    }

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded) {
      // Fetch the user details from the database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res
          .status(200)
          .json({ isLoggedIn: false, message: "User not found" });
      }

      return res.status(200).json({
        isLoggedIn: true,
      });
    } else {
      return res
        .status(200)
        .json({ isLoggedIn: false, message: "Invalid token" });
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res
        .status(200)
        .json({ isLoggedIn: false, message: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res
        .status(200)
        .json({ isLoggedIn: false, message: "Token expired" });
    }

    console.error("Error checking login status:", error);
    return res.status(500).json({ isLoggedIn: false, message: "Server error" });
  }
});

router.get("/portfolios", verifyToken, async (req, res) => {
  try {
    // Fetch the user details with settings for plan check.
    const user = await User.findById(req.userId).select(
      "portfolios.name portfolios._id portfolios.stocks portfolios.updatedAt settings"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prepare portfolio data.
    let portfolios = user.portfolios.map((portfolio) => ({
      id: portfolio._id,
      name: portfolio.name,
      stockCount: portfolio.stocks.length,
      updatedAt: portfolio.updatedAt,
    }));

    res.status(200).json({
      message: "Portfolios retrieved successfully",
      portfolios,
    });
  } catch (error) {
    console.error("Error retrieving portfolios:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/portfolio/delete", verifyToken, async (req, res) => {
  // Get the portfolio ID from query parameters.
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "Portfolio ID is required." });
  }

  try {
    // Find the user by ID.
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the portfolio exists.
    const portfolioIndex = user.portfolios.findIndex(
      (p) => p._id.toString() === id
    );
    if (portfolioIndex === -1) {
      return res.status(404).json({ message: "Portfolio not found." });
    }

    // Remove the portfolio using splice.
    user.portfolios.splice(portfolioIndex, 1);

    // Save the updated user document.
    await user.save();

    res.status(200).json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch("/portfolio/update/name", verifyToken, async (req, res) => {
  // Get the portfolio ID from the query parameters.
  const { id } = req.query;
  // Get the new name from the request body.
  const { name } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Portfolio ID is required." });
  }

  if (!name) {
    return res.status(400).json({ message: "New portfolio name is required." });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Find the portfolio by ID.
    const portfolio = user.portfolios.id(id);
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found." });
    }

    // Update the portfolio name.
    portfolio.name = name;

    // Save the user document.
    await user.save();

    res.status(200).json({
      message: "Portfolio name updated successfully",
      portfolioId: id,
      newName: name,
    });
  } catch (error) {
    console.error("Error updating portfolio name:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
