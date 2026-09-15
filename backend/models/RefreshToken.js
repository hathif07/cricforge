const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = { RefreshToken };
