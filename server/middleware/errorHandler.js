function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.message, err.stack);

  const status = err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
