import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    const options: mongoose.ConnectOptions = {
      // Minimal pool for memory-constrained cPanel hosting
      maxPoolSize: 3,
      minPoolSize: 1,

      // Conservative timeouts
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,

      // Reduce memory overhead
      maxIdleTimeMS: 30000,       // Close idle connections faster
      heartbeatFrequencyMS: 30000, // Less frequent heartbeats

      retryWrites: true,
      retryReads: true,
      family: 4,
    };

    const conn = await mongoose.connect(env.MONGODB_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Only monitor in dev — avoids interval overhead in production
    if (!isProduction) {
      setInterval(() => {
        const state = mongoose.connection.readyState;
        logger.debug(`MongoDB Connection State: ${state}`);
      }, 60000);
    }

    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed gracefully');
      } catch (err) {
        logger.error('Error closing MongoDB:', err);
      }
      process.exit(0);
    });

  } catch (error) {
    logger.error(`MongoDB Connection Error: ${(error as Error).message}`);
    process.exit(1);
  }
};