// Wraps an async route handler so thrown/rejected errors reach Express's error middleware
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = asyncHandler;
