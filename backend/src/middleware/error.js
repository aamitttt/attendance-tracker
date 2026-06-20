import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// Central error handler — maps known error shapes to clean JSON + status codes.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Mongo duplicate key (e.g. double check-in, duplicate email).
  if (err && err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: err.keyValue,
    });
  }

  // Mongoose validation errors.
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  console.error('[error]', err);
  return res.status(500).json({ error: 'Internal server error' });
}
