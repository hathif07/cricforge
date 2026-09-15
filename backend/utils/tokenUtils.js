const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config/jwt');
const { RefreshToken } = require('../models/RefreshToken');

const generateAccessToken = (user) => {
  const payload = { id: user._id, email: user.email, name: user.name, roles: user.roles };
  return jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpiry });
};

const generateRefreshToken = async (user) => {
  const payload = { id: user._id, jti: crypto.randomUUID() };
  const token = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiry });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({ user_id: user._id, token, expires_at: expiresAt });
  return token;
};

const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, jwtConfig.refreshSecret);

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
