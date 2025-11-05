const { cache } = require('../config/redis');

// Cache middleware for API responses
const cacheMiddleware = (duration = 300) => { // Default 5 minutes
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests
    if (req.headers.authorization) {
      return next();
    }

    const key = `api:${req.originalUrl}`;

    try {
      // Try to get cached response
      const cachedResponse = await cache.get(key);
      if (cachedResponse) {
        console.log(`📋 Cache hit for: ${req.originalUrl}`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Cache miss - intercept response
      console.log(`📭 Cache miss for: ${req.originalUrl}`);
      res.set('X-Cache', 'MISS');

      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(key, data, duration).catch(err =>
            console.error('Cache set error:', err.message)
          );
        }

        // Call original json method
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      // Continue without caching if Redis fails
      next();
    }
  };
};

// Fallback cache using in-memory store when Redis is unavailable
const memoryCache = new Map();

const fallbackCache = {
  set: async (key, value, expireInSeconds = 3600) => {
    try {
      const expireAt = Date.now() + (expireInSeconds * 1000);
      memoryCache.set(key, { value, expireAt });
      return true;
    } catch (error) {
      console.error('Memory cache set error:', error.message);
      return false;
    }
  },

  get: async (key) => {
    try {
      const item = memoryCache.get(key);
      if (!item) return null;

      if (Date.now() > item.expireAt) {
        memoryCache.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Memory cache get error:', error.message);
      return null;
    }
  },

  del: async (key) => {
    try {
      memoryCache.delete(key);
      return true;
    } catch (error) {
      console.error('Memory cache del error:', error.message);
      return false;
    }
  }
};

// Clear cache for specific patterns
const clearCache = async (pattern) => {
  try {
    // Use Redis KEYS to find matching cache keys
    const keys = await cache.keys(`api:*${pattern}*`);

    if (keys && keys.length > 0) {
      await cache.del(...keys);
      console.log(`🗑️ Cache cleared for pattern: ${pattern} (${keys.length} keys)`);
    } else {
      console.log(`🗑️ No cache keys found for pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Clear cache error:', error.message);
  }
};

// Cache for database queries
const queryCache = {
  // Cache database query results
  get: async (key, queryFn, ttl = 300) => {
    try {
      let result = await cache.get(key);
      if (result) {
        console.log(`🗃️ Query cache hit: ${key}`);
        return result;
      }

      console.log(`🗃️ Query cache miss: ${key}`);
      result = await queryFn();
      await cache.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error('Query cache error:', error.message);
      // Fallback to direct query
      return await queryFn();
    }
  },

  // Invalidate query cache
  invalidate: async (key) => {
    try {
      await cache.del(key);
      console.log(`🚫 Query cache invalidated: ${key}`);
    } catch (error) {
      console.error('Query cache invalidate error:', error.message);
    }
  }
};

module.exports = {
  cacheMiddleware,
  clearCache,
  queryCache,
  fallbackCache
};
