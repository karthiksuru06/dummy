const express = require('express');
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Local file serving has been removed for Render deployment compatibility.
 * All files are now uploaded to Cloudinary, and their secure URLs are stored
 * directly in the database. Frontend should use the URLs from the database.
 */
router.get(
  '/:name',
  authenticate,
  asyncHandler(async (req, res) => {
    throw new AppError('Local file serving is disabled. Files are now served via Cloudinary URLs stored in the database.', 404);
  })
);

module.exports = router;