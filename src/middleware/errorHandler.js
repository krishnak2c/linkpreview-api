/**
 * Global error handler. Returns a consistent JSON error shape.
 */
export default function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err)

  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred.'
  })
}
