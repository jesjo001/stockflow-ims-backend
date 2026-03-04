import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';
import { logger } from '../config/logger';

let store: any;

// Try to use Redis store if available (optional for VPS optimization)
if (env.REDIS_URL) {
  try {
    // Dynamically require to avoid hard dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisStore = require('rate-limit-redis');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis');
    const redisClient = new Redis(env.REDIS_URL, {
      enableReadyCheck: false,
      enableOfflineQueue: false,
      retryStrategy: (times) => times > 3 ? null : Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    // Suppress unhandled error events
    redisClient.on('error', () => {
      // Silently handle errors - store will be null and rate limiter will use memory
    });
    redisClient.setMaxListeners(0);

    store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
    logger.info('Rate limiter using Redis store for distributed caching');
  } catch (err) {
    logger.warn('Redis store not available, using in-memory rate limiting');
  }
}

// Strict limiter for Auth routes (Login/Register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 requests per window
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  store, // Optional Redis store
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
});

// General limiter for API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store, // Optional Redis store
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
});
