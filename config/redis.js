const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// Redis configuration with provided credentials
const redisConfig = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  offlineQueue: false, // Disable offline queue to prevent memory issues
  commandTimeout: 5000, // 5 second timeout for commands
  connectTimeout: 10000, // 10 second connection timeout
};

// Create Redis client
let redisClient = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient(redisConfig);

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      console.warn('⚠️  Redis unavailable - using fallback in-memory storage');
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis client ready and operational');
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
      console.warn('⚠️  Redis disconnected - switching to fallback mode');
    });

    try {
      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error.message);
      redisClient = null; // Reset to allow retry
      throw error;
    }

    // Check initial connection status
    setTimeout(() => {
      if (redisClient && redisClient.status === 'ready') {
        console.log('✅ Redis is connected and ready');
      } else if (redisClient && redisClient.status === 'connecting') {
        console.log('⏳ Redis is connecting...');
      } else {
        console.warn('⚠️  Redis is not connected - application will use fallback storage');
        console.log('💡 Tip: For production, consider using a Redis service like Redis Cloud or AWS ElastiCache');
      }
    }, 1000);
  }

  return redisClient;
};

// Cache wrapper functions
const cache = {
  // Set cache with expiration
  set: async (key, value, expireInSeconds = 3600) => {
    try {
      const client = await getRedisClient();
      const serializedValue = JSON.stringify(value);
      await client.setEx(key, expireInSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis set error:', error.message);
      return false;
    }
  },

  // Get cache
  get: async (key) => {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null;
    }
  },

  // Delete cache
  del: async (key) => {
    try {
      const client = await getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error.message);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const client = await getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error.message);
      return false;
    }
  },

  // Set hash field
  hset: async (key, field, value) => {
    try {
      const client = await getRedisClient();
      await client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis hset error:', error.message);
      return false;
    }
  },

  // Get hash field
  hget: async (key, field) => {
    try {
      const client = await getRedisClient();
      const value = await client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis hget error:', error.message);
      return null;
    }
  },

  // Get all hash fields
  hgetall: async (key) => {
    try {
      const client = await getRedisClient();
      const result = await client.hgetall(key);
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      console.error('Redis hgetall error:', error.message);
      return {};
    }
  },

  // Increment counter
  incr: async (key) => {
    try {
      const client = await getRedisClient();
      return await client.incr(key);
    } catch (error) {
      console.error('Redis incr error:', error.message);
      return 0;
    }
  },

  // Set expiration on key
  expire: async (key, seconds) => {
    try {
      const client = await getRedisClient();
      await client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error.message);
      return false;
    }
  },

  // Get time to live
  ttl: async (key) => {
    try {
      const client = await getRedisClient();
      return await client.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error.message);
      return -1;
    }
  },

  // Flush all data (use with caution)
  flushall: async () => {
    try {
      const client = await getRedisClient();
      await client.flushall();
      return true;
    } catch (error) {
      console.error('Redis flushall error:', error.message);
      return false;
    }
  }
};

module.exports = {
  getRedisClient,
  cache
};
