'use strict';

/**
 * Auth Middleware
 * Extracts x-user-id from request headers and attaches to req.userId.
 * Returns 401 if header is missing or not a valid integer.
 */
function auth(req, res, next) {
  const rawId = req.headers['x-user-id'];

  if (!rawId) {
    return res.status(401).json({ error: 'Missing x-user-id header' });
  }

  const userId = parseInt(rawId, 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(401).json({ error: 'Invalid x-user-id header value' });
  }

  req.userId = userId;
  next();
}

module.exports = auth;
