const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  token_hash: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// TTL index: Mongo purges rows once expires_at passes.
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
