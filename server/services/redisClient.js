// server/services/redisClient.js
const Redis = require('ioredis');

// Create Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Add prefix to keys
const prefixKey = (key) => {
  const prefix = process.env.REDIS_PREFIX || 'lightrail:';
  return `${prefix}${key}`;
};

// Handle Redis errors
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

// Log when connected
redis.on('connect', () => {
  console.log('Connected to Redis');
});

module.exports = { redis, prefixKey };
