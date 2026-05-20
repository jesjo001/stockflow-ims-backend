import { AuthService } from '../../services/auth.service';
import { User } from '../../models/User.model';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000); // Increased timeout to 30 seconds

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AuthService', () => {
  it('should register a new super admin', async () => {
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      tenantName: 'Test Tenant',
      tenantCode: 'TEST123'
    };

    const result = await AuthService.registerSuperAdmin(userData);
    expect(result.user.email).toBe(userData.email);
    expect(result.requiresEmailVerification).toBe(true);
    expect(result.user.isEmailVerified).toBe(false);
    expect(result.message).toContain('Please verify your email');
    expect(result.tenant.name).toBe(userData.tenantName);
  });
});
