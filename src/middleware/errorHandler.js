/**
 * Application error with HTTP status code.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * Global error handler. Returns a consistent JSON error shape.
 */
export default function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err)

  const statusCode = err.statusCode || 500

  if (statusCode === 400) {
    return res.status(400).json({ error: 'bad_request', message: err.message })
  }

  res.status(statusCode).json({
    error: 'internal_error',
    message: statusCode === 500 ? 'An unexpected error occurred.' : err.message
  })
}
