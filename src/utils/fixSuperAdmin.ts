import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { env } from '../config/env';

// Explicitly load .env file for standalone script execution
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

async function fixSuperAdmin(email: string, newPassword: string) {
  if (!env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined. Make sure it is set in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log('Updating password...');

    user.password = newPassword;
    await user.save(); // This will trigger the 'pre-save' hook to hash the password

    console.log(`✅ Successfully updated password for ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ An error occurred:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: npx ts-node src/utils/fixSuperAdmin.ts <email> <password>');
  process.exit(1);
}

fixSuperAdmin(email, password);
