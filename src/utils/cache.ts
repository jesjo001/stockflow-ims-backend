import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { env } from '../config/env';
import { logger } from '../config/logger';

class CacheManager {
  private redis: Redis | null = null;
  private localCache: NodeCache;
  private useRedis: boolean = false;

  constructor() {
    this.localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Default 5 mins

    if (env.REDIS_URL) {
      this.redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis connection failed, falling back to in-memory cache.');
            this.useRedis = false;
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
      });

      this.redis.on('connect', () => {
        logger.info('Connected to Redis Cache');
        this.useRedis = true;
      });

      this.redis.on('error', (err) => {
        // Silently handle connection errors, fall back to in-memory cache
        this.useRedis = false;
      });

      // Suppress unhandled error events
      this.redis.setMaxListeners(0);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }
      return (this.localCache.get(key) as T) || null;
    } catch (error) {
      logger.error('Cache Get Error', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } else {
        this.localCache.set(key, value, ttlSeconds);
      }
    } catch (error) {
      logger.error('Cache Set Error', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(key);
      } else {
        this.localCache.del(key);
      }
    } catch (error) {
      logger.error('Cache Del Error', error);
    }
  }

  async flush(): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.flushall();
    } else {
      this.localCache.flushAll();
    }
  }
}

export const cache = new CacheManager();
