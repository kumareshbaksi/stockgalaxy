const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Google OAuth login route.
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route.
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      // Extract authenticated user's details.
      const { id } = req.user;

      // Generate JWT token.
      const token = jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Set the JWT token in an HTTP-only cookie.
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to the frontend dashboard.
      res.redirect(process.env.FRONTEND_URL + "/dashboard");
    } catch (error) {
      console.error("Error in Google Auth Callback:", error);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
