import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const options: mongoose.ConnectOptions = {
      // Connection pooling for VPS/cPanel
      maxPoolSize: isProduction ? 5 : 10, // Smaller pool for constrained environments
      minPoolSize: isProduction ? 2 : 1,
      
      // Timeouts optimized for hosted environments
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      
      // Query optimization
      directConnection: false, // Use connection string topology
      
      // Memory optimization
      retryWrites: true,
      retryReads: true,
      
      // Connection reuse
      family: 4, // Use IPv4 only (faster than IPv6 fallback)
    };

    const conn = await mongoose.connect(env.MONGODB_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection pool monitoring (development only)
    if (!isProduction) {
      setInterval(() => {
        const state = mongoose.connection.readyState;
        logger.debug(`MongoDB Connection State: ${state}`);
      }, 60000);
    }
    
    // Graceful shutdown
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
