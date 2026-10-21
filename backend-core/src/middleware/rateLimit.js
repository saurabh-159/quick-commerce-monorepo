const sendResponse = require('../utils/apiResponse');

const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 60 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    buckets.set(ip, bucket);

    if (bucket.count > max) {
      return sendResponse(res, 429, false, 'Too many requests. Please try again shortly.', null);
    }

    next();
  };
}

module.exports = rateLimit;
