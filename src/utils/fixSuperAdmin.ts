import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User.model';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Explicitly load .env file for standalone script execution
// @ts-expect-error: dynamic require is used for path resolution in some environments
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fixSuperAdmin(email: string, newPassword: string) {
  if (!env.MONGODB_URI) {
    logger.error('❌ MONGODB_URI is not defined. Make sure it is set in your .env file.');
    process.exit(1);
  }

  try {
    logger.info('Attempting to connect to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.error(`❌ User with email "${email}" not found.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    logger.info(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    logger.info('Updating password...');

    user.password = newPassword;
    await user.save(); // This will trigger the 'pre-save' hook to hash the password

    logger.info(`✅ Successfully updated password for ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ An error occurred:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  logger.info('Usage: npx ts-node src/utils/fixSuperAdmin.ts <email> <password>');
  process.exit(1);
}

fixSuperAdmin(email, password);
