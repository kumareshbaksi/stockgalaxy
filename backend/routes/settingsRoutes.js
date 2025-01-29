const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

const router = express.Router();

/**
 * Route to update user settings.
 * This updates specific settings for the logged-in user.
 */
router.put('/user/settings', verifyToken, async (req, res) => {
  const { redirectToWatchlist } = req.body;

  if (redirectToWatchlist === undefined) {
    return res.status(400).json({ message: 'Missing required settings field: redirectToWatchlist' });
  }

  try {
    // Find the logged-in user.
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the settings field.
    user.settings.redirectToWatchlist = redirectToWatchlist;
    await user.save();

    res.status(200).json({
      message: 'Settings updated successfully',
      settings: user.settings,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
