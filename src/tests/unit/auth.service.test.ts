import { AuthService } from '../../services/auth.service';
import { User } from '../../models/User.model';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

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
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.tenant.name).toBe(userData.tenantName);
  });
});
