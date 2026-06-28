function requestLogger(req, res, next) {
  const startedAt = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startedAt
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`)
  })

  return next()
}

module.exports = {
  requestLogger,
}