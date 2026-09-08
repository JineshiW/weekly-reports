const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Pulls the auth token from either an "Authorization: Bearer ..." header
// or the httpOnly cookie, so both API clients and the browser app work.
function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.token || null;
}

// Verifies the token, loads the corresponding user, and attaches it to
// req.user for downstream handlers. Rejects missing/invalid/expired tokens
// and accounts that have since been deactivated.
async function requireLogin(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Not signed in' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ message: 'Account unavailable' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired or invalid' });
  }
}

// Managers double as the admin role in this tool.
// Must run after requireLogin, since it relies on req.user being set.
function requireManager(req, res, next) {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ message: 'Manager access only' });
  }
  next();
}

module.exports = { requireLogin, requireManager };