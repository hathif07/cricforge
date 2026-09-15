const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'cricforge_access_secret_change_me',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'cricforge_refresh_secret_change_me',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
};

module.exports = { jwtConfig };
