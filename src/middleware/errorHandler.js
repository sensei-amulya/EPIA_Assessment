/**
 * 404 Not Found Middleware for unmatched routes
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
}

/**
 * Global Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  const status = err.status || err.statusCode || 500;
  const response = {
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server.'
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}
