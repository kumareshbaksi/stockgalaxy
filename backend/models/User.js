const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
});

// Settings Schema
const SettingsSchema = new mongoose.Schema({
  // Reference to default portfolio.
  defaultPortfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Portfolio",
  },
});

const PortfolioSchema = new mongoose.Schema({
  // Name of the portfolio.
  name: { type: String, required: true },
  // Array of stocks in the portfolio.
  stocks: { type: [StockSchema], default: [] },
  // Manually added updatedAt field.
  updatedAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  // Full name of the user.
  name: { type: String },
  // URL of the user's profile picture.
  profilePicture: { type: String },
  // Embedded array of stocks.
  portfolio: { type: [StockSchema], default: [] },
  // Array of portfolios.
  portfolios: { type: [PortfolioSchema], default: [] },
  // Embedded settings object.
  settings: { type: SettingsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
