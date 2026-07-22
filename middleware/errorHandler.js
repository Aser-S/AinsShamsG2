/**
 * Global error handler middleware.
 * Must be registered last in app.js.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: message });
  }

  return res.status(status).send(`<h1>${status} — ${message}</h1>`);
}

module.exports = errorHandler;
