const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Access token expired. Please refresh your token.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid access token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.is_active) req.user = user;
  } catch (err) {
    // ignore - treated as anonymous
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate };
