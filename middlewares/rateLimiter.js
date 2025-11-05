const rateLimit = require('express-rate-limit');
const { cache } = require('../config/redis');

// Import the IPv6-safe key generator
const { ipKeyGenerator } = require('express-rate-limit');

// Fallback in-memory store for rate limiting when Redis is unavailable
const memoryStore = new Map();

const fallbackStore = {
  incr: async (key) => {
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1 minute windows
    const windowKey = `${key}:${windowStart}`;

    let count = memoryStore.get(windowKey) || 0;
    count += 1;
    memoryStore.set(windowKey, count);

    // Clean up old entries
    for (const [k, v] of memoryStore.entries()) {
      if (k.startsWith(`${key}:`) && parseInt(k.split(':')[1]) < windowStart) {
        memoryStore.delete(k);
      }
    }

    return count;
  },

  resetKey: async (key) => {
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000;
    const windowKey = `${key}:${windowStart}`;
    memoryStore.delete(windowKey);
  }
};

// General API rate limiter
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = ipKeyGenerator,
    handler = (req, res) => {
      res.status(429).json(message);
    }
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler
  });
};

// Strict rate limiter for authentication endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  }
});

// API rate limiter for general endpoints
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false
});

// Strict rate limiter for sensitive operations
const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many requests, please slow down.',
    retryAfter: 60
  }
});

// File upload rate limiter
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Upload limit exceeded, please try again later.',
    retryAfter: 3600
  }
});

// Custom Redis-based rate limiter for more complex scenarios
const createRedisRateLimiter = (options = {}) => {
  const {
    keyPrefix = 'rl',
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Rate limit exceeded'
  } = options;

  return async (req, res, next) => {
    try {
      const key = `${keyPrefix}:${req.ip}:${Math.floor(Date.now() / windowMs)}`;
      const current = await cache.incr(key);

      if (current === 1) {
        // Set expiration for the key
        await cache.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - current),
        'X-RateLimit-Reset': Math.ceil((Date.now() + windowMs) / 1000)
      });

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // If Redis fails, allow the request to proceed
      next();
    }
  };
};

// User-based rate limiter (requires authentication)
const userRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 30, // 30 requests per minute per user
    message = 'User rate limit exceeded'
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(); // Skip if not authenticated
      }

      const key = `user_rl:${req.user.id}:${Math.floor(Date.now() / windowMs)}`;
      const current = await cache.incr(key);

      if (current === 1) {
        await cache.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('User rate limiter error:', error);
      next(); // Allow request if Redis fails
    }
  };
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  uploadRateLimiter,
  createRedisRateLimiter,
  userRateLimiter,
  fallbackStore
};
