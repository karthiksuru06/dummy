const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

/**
 * Replaces `app.use('/uploads', express.static(...))`, which served all PHI
 * documents publicly with guessable epoch-timestamp names. Now: must be
 * authenticated, and the resolved path is constrained to UPLOADS_DIR so a
 * crafted `../` name cannot escape the directory.
 *
 * NOTE: this enforces "must be logged in." Per-record ownership (this patient
 * owns this report) is enforced by the resource endpoints in routes/patient.js
 * (reports/view/:id, reports/download/:id). See ADR-002.
 */
router.get(
  '/:name',
  authenticate,
  audit('file.access', 'Upload'),
  asyncHandler(async (req, res) => {
    const requested = path.basename(req.params.name); // strip any path segments
    const resolved = path.resolve(UPLOADS_DIR, requested);

    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      throw new AppError('Invalid path', 400);
    }
    if (!fs.existsSync(resolved)) {
      throw new AppError('File not found', 404);
    }

    res.setHeader('Content-Disposition', `inline; filename="${requested}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  })
);

module.exports = router;
