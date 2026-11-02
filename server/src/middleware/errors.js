export function notFound(req, res) {
  res.status(404).json({ error: 'The requested resource was not found.' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'Please check the information and try again.', details: err.issues?.map((x) => ({ path: x.path.join('.'), message: x.message })) });
  }
  if (err?.code === 11000) return res.status(409).json({ error: 'This record already exists. Refresh and try again.' });
  if (err?.name === 'ValidationError') return res.status(400).json({ error: 'Some information is invalid.', details: Object.values(err.errors).map((x) => x.message) });
  const status = Number.isInteger(err?.status) ? err.status : 500;
  if (status >= 500) console.error('[api-error]', err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
}
