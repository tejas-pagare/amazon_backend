'use strict';

/**
 * Centralized Error Handler Middleware
 * Must be registered LAST in app.js (after all routes).
 *
 * Handles:
 *  - Validation errors (status 400 with array of messages)
 *  - Custom AppError instances (uses err.statusCode)
 *  - Generic server errors (status 500)
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // express-validator validation errors (passed via next({ errors }))
  if (err.isValidationError) {
    return res.status(400).json({ errors: err.errors });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry — resource already exists' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource does not exist' });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Data constraint violation' });
  }

  // Fallback
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorHandler]', err);
  }
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler, AppError };
