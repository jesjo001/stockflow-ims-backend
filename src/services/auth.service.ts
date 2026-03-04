import { User, IUserDocument } from '../models/User.model';
import { Tenant } from '../models/Tenant.model';
import { Branch } from '../models/Branch.model';
import { ApiError } from '../utils/ApiError';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens';
import { emailService } from '../utils/email';
import { generatePasswordResetToken, hashPasswordResetToken, getPasswordResetExpiry } from '../utils/passwordReset';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export class AuthService {
  /**
   * Register a new super admin user
   * Creates a tenant for the super admin
   */
  static async registerSuperAdmin(userData: any) {
    let session: any = null;
    try {
      // Try to create a session for transaction support
      try {
        session = await mongoose.startSession();
        await session.startTransaction();
      } catch (txError) {
        // Transactions not supported (standalone MongoDB), continue without session
        session = null;
        console.warn('⚠️  Transactions not available (standalone MongoDB), using fallback mode');
      }

      // Generate default tenant name and code
      const tenantName = userData.tenantName || `${userData.firstName}`;
      const tenantCode = userData.tenantCode || `TENANT_${Date.now()}`;

      // 1. Create tenant first
      const tenant = await Tenant.create([{
        name: tenantName,
        code: tenantCode,
      }]);

      // 2. Create user with tenantId from newly created tenant
      const user = await User.create([{
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: 'super_admin',
        tenantId: tenant[0]._id,
        isActive: true,
      }]);

      // 3. Update tenant with superAdminId
      await Tenant.findByIdAndUpdate(
        tenant[0]._id,
        { superAdminId: user[0]._id }
      );

      // 4. Create default main branch for tenant
      const defaultBranchCode = `MAIN_${tenant[0]._id.toString().slice(-6).toUpperCase()}`;
      await Branch.create([{
        tenantId: tenant[0]._id,
        name: 'Default Main Branch',
        code: defaultBranchCode,
        address: 'Main Office',
        phone: userData.phone || '',
        email: userData.email,
        isActive: true,
        isHeadOffice: true,
        currency: 'USD',
        timezone: 'UTC',
      }]);

      // 5. Generate tokens
      const accessToken = generateAccessToken(user[0]._id.toString(), tenant[0]._id.toString());
      const refreshToken = generateRefreshToken(user[0]._id.toString(), tenant[0]._id.toString());
      
      user[0].refreshToken = refreshToken;
      await user[0].save({ validateBeforeSave: false });

      if (session) {
        await session.commitTransaction();
      }

      return { user: user[0], accessToken, refreshToken, tenant: tenant[0] };
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          // Ignore abort errors
        }
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Register a new user (called by admin/super_admin)
   * Generates password reset token and sends invitation email
   */
  static async register(userData: any, adminTenantId: string, tenantName: string) {
    let session: any = null;
    try {
      // Try to create a session for transaction support
      try {
        session = await mongoose.startSession();
        await session.startTransaction();
      } catch (txError) {
        // Transactions not supported (standalone MongoDB), continue without session
        session = null;
        console.warn('⚠️  Transactions not available (standalone MongoDB), using fallback mode');
      }

      // Generate password reset token
      const { hashedToken, plainToken } = generatePasswordResetToken();
      const resetExpiry = getPasswordResetExpiry();

      // Create user with reset token
      const user = await User.create([{
        ...userData,
        tenantId: adminTenantId,
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpiry,
      }]);

      if (session) {
        await session.commitTransaction();
      }

      // Send invitation email (async, don't wait)
      emailService.sendUserInvitation(
        user[0].email,
        user[0].firstName,
        plainToken,
        tenantName
      ).catch((error) => {
        console.error('Failed to send invitation email:', error);
      });

      return { 
        user: user[0], 
        message: 'User created successfully. Invitation email sent.' 
      };
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          // Ignore abort errors
        }
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Incorrect email or password');
    }

    if (!user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User account is deactivated');
    }

    const accessToken = generateAccessToken(user._id.toString(), user.tenantId.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), user.tenantId.toString());

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return { user, accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Refresh token is required');
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken(user._id.toString(), user.tenantId.toString());
    return { accessToken };
  }

  static async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { refreshToken: undefined });
  }

  /**
   * Reset password using reset token (for new users or password reset)
   */
  static async resetPassword(token: string, newPassword: string) {
    // Hash the token to compare with stored token
    const hashedToken = hashPasswordResetToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  /**
   * Forgot password - initiate password reset for existing user
   */
  static async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Generate password reset token
    const { hashedToken, plainToken } = generatePasswordResetToken();
    const resetExpiry = getPasswordResetExpiry();

    // Save to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpiry;
    await user.save({ validateBeforeSave: false });

    // Send email
    await emailService.sendPasswordResetEmail(user.email, user.firstName, plainToken);

    return { message: 'Password reset email sent successfully' };
  }
}
