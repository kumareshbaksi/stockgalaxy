const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

// Middleware to authenticate and fetch user data
router.get("/", async (req, res) => {
  // Extract the token from cookies
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // Verify the token using the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with user data
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
      portfolio: user.portfolio,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    res.status(500).json({ message: "Server error" });
  }
});

// API endpoint to update the default portfolio setting
// Route to update default portfolio
router.post("/default-portfolio", verifyToken, async (req, res) => {
  const userId = req.userId;
  const { portfolioId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the portfolio belongs to the user before setting it as default.
    const portfolioExists = user.portfolios.some(
      (portfolio) => portfolio._id.toString() === portfolioId
    );

    if (!portfolioExists) {
      return res
        .status(400)
        .json({ message: "Portfolio not found among user's portfolios." });
    }

    // Set the default portfolio.
    user.settings.defaultPortfolioId = portfolioId;
    await user.save();

    // Optionally, return details of the new default portfolio.
    const defaultPortfolio = user.portfolios.find(
      (p) => p._id.toString() === portfolioId
    );

    res.status(200).json({
      message: "Default portfolio updated successfully.",
      defaultPortfolio: {
        id: defaultPortfolio._id,
        name: defaultPortfolio.name,
      },
    });
  } catch (error) {
    console.error("Error updating default portfolio:", error);
    res
      .status(500)
      .json({
        message: "Failed to update default portfolio.",
        error: error.message,
      });
  }
});

router.get("/settings", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId).select("settings portfolios");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let settings = user.settings;
    let portfolioDetails = null;
    let validDefaultPortfolioId = null;
    // Check if the defaultPortfolioId is set and verify it exists in the user's portfolios
    if (
      settings.defaultPortfolioId &&
      user.portfolios.some(
        (p) => p._id.toString() === settings.defaultPortfolioId.toString()
      )
    ) {
      const portfolio = user.portfolios.find(
        (p) => p._id.toString() === settings.defaultPortfolioId.toString()
      );
      portfolioDetails = {
        id: portfolio._id,
        name: portfolio.name,
        stockCount: portfolio.stocks.length,
      };
      validDefaultPortfolioId = portfolio._id;
    } else {
      // If no valid defaultPortfolioId is found, and there are portfolios
      // available, set the first as default
      if (user.portfolios.length > 0) {
        const firstPortfolio = user.portfolios[0];
        settings.defaultPortfolioId = firstPortfolio._id;
        // Save the user with the updated default portfolio.
        await user.save();
        portfolioDetails = {
          id: firstPortfolio._id,
          name: firstPortfolio.name,
          stockCount: firstPortfolio.stocks.length,
        };
        validDefaultPortfolioId = firstPortfolio._id;
      }
    }

    res.json({
      redirectToWatchlist: settings.redirectToWatchlist,
      planType: settings.planType,
      defaultPortfolioId: validDefaultPortfolioId,
      defaultPortfolioDetails: portfolioDetails || null,
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res
      .status(500)
      .json({
        message: "Failed to fetch user settings.",
        error: error.message,
      });
  }
});

module.exports = router;
