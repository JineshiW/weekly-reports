// Single place that turns thrown errors into JSON responses.
function handleErrors(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  if (status === 500) console.error(err);

  res.status(status).json({
    message: err.message || 'Something went wrong',
    details: err.details,
  });
}

module.exports = handleErrors;
