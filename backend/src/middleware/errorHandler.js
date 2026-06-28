function notFound(_req, res) {
  return res.status(404).json({ error: 'Route not found.' })
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || error.status || error.response?.status || 500

  if (statusCode >= 500) {
    console.error(error)
  }

  return res.status(statusCode).json({
    error:
      error.response?.data?.error_description ||
      error.message ||
      'Unexpected server error',
  })
}

module.exports = {
  notFound,
  errorHandler,
}