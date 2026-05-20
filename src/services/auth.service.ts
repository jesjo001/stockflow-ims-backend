import { User } from '../models/User.model';
import { Tenant } from '../models/Tenant.model';
import { Branch } from '../models/Branch.model';
import { Affiliate } from '../models/Affiliate.model';
import { PlatformSetting } from '../models/PlatformSetting.model';
import { ApiError } from '../utils/ApiError';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens';
import { emailService } from '../utils/email';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetExpiry,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  getEmailVerificationExpiry,
} from '../utils/passwordReset';
import { logger } from '../config/logger';
import { StatusCodes } from 'http-status-codes';
import { startTransactionSession } from '../utils/mongoTransaction';
import { enforceTenantResourceLimit, getTenantPlanLimits } from '../utils/planLimits';

export class AuthService {
  /**
   * Register a new super admin user
   * Creates a tenant for the super admin
   */
  static async registerSuperAdmin(userData: any) {
    let session: any = null;
    try {
      session = await startTransactionSession();

      // Generate default tenant name and code
      const tenantName = userData.tenantName || `${userData.firstName}`;
      const tenantCode = userData.tenantCode || `TENANT_${Date.now()}`;

      // Get platform default affiliate percentage
      const platformSettings = await PlatformSetting.findOne({ key: 'global' });
      const defaultPercentage = platformSettings?.defaultAffiliatePercentage || 10;

      // Look up affiliate if referral code provided
      let referredByAffiliate = null;
      let affiliatePercentage = undefined;
      if (userData.affiliateCode) {
        const affiliate = await Affiliate.findOne({ code: userData.affiliateCode.toUpperCase(), isActive: true });
        if (affiliate) {
          referredByAffiliate = affiliate._id;
          affiliatePercentage = affiliate.commissionPercentage;
          // Increment referral count
          await Affiliate.findByIdAndUpdate(affiliate._id, { $inc: { totalReferrals: 1 } });
        }
      }

      // 1. Create tenant first
      const tenant = await Tenant.create([{
        name: tenantName,
        code: tenantCode,
        referredByAffiliate,
        affiliateCommissionPercentage: affiliatePercentage || defaultPercentage,
      }]);

      // 2. Create user with tenantId from newly created tenant
      const { hashedToken, plainToken } = generateEmailVerificationToken();
      const verificationExpiry = getEmailVerificationExpiry();

      const user = await User.create([{
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: 'super_admin',
        tenantId: tenant[0]._id,
        isActive: true,
        isEmailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpiry,
      }]);

      // 3. Update tenant with superAdminId
      await Tenant.findByIdAndUpdate(
        tenant[0]._id,
        { superAdminId: user[0]._id }
      );

      // 4. Create default main branch for tenant
      const defaultBranchCode = `MAIN_${tenant[0]._id.toString().slice(-6).toUpperCase()}`;
      const defaultBranch = await Branch.create([{
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

      // 5. Assign default branch to user and update
      user[0].branch = defaultBranch[0]._id;
      await user[0].save({ validateBeforeSave: false });

      if (session) {
        await session.commitTransaction();
      }

      emailService.sendEmailVerificationEmail(
        user[0].email,
        user[0].firstName,
        plainToken,
        tenant[0].name
      ).catch((error) => {
        logger.error('Failed to send signup verification email', error);
      });

      return {
        user: user[0],
        tenant: tenant[0],
        requiresEmailVerification: true,
        message: 'Signup successful. Please verify your email to continue.',
      };
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
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
   * Register the initial super admin user
   * Creates a tenant for the new account
   */
  static async registerOwner(userData: any) {
    let session: any = null;
    try {
      session = await startTransactionSession();

      // Generate default tenant name and code
      const tenantName = userData.tenantName || `${userData.firstName}`;
      const tenantCode = userData.tenantCode || `TENANT_${Date.now()}`;

      // Get platform default affiliate percentage
      const platformSettings = await PlatformSetting.findOne({ key: 'global' });
      const defaultPercentage = platformSettings?.defaultAffiliatePercentage || 10;

      // Look up affiliate if referral code provided
      let referredByAffiliate = null;
      let affiliatePercentage = undefined;
      if (userData.affiliateCode) {
        const affiliate = await Affiliate.findOne({ code: userData.affiliateCode.toUpperCase(), isActive: true });
        if (affiliate) {
          referredByAffiliate = affiliate._id;
          affiliatePercentage = affiliate.commissionPercentage;
          // Increment referral count
          await Affiliate.findByIdAndUpdate(affiliate._id, { $inc: { totalReferrals: 1 } });
        }
      }

      // 1. Create tenant first
      const tenant = await Tenant.create([{
        name: tenantName,
        code: tenantCode,
        referredByAffiliate,
        affiliateCommissionPercentage: affiliatePercentage || defaultPercentage,
      }]);

      // 2. Create user with tenantId from newly created tenant
      const { hashedToken, plainToken } = generateEmailVerificationToken();
      const verificationExpiry = getEmailVerificationExpiry();

      const user = await User.create([{
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: 'super_admin',
        tenantId: tenant[0]._id,
        isActive: true,
        isEmailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpiry,
      }]);

      // 3. Update tenant with superAdminId
      await Tenant.findByIdAndUpdate(
        tenant[0]._id,
        { superAdminId: user[0]._id }
      );

      // 4. Create default main branch for tenant
      const defaultBranchCode = `MAIN_${tenant[0]._id.toString().slice(-6).toUpperCase()}`;
      const defaultBranch = await Branch.create([{
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

      // 5. Assign default branch to user and update
      user[0].branch = defaultBranch[0]._id;
      await user[0].save({ validateBeforeSave: false });

      if (session) {
        await session.commitTransaction();
      }

      emailService.sendEmailVerificationEmail(
        user[0].email,
        user[0].firstName,
        plainToken,
        tenant[0].name
      ).catch((error) => {
        logger.error('Failed to send signup verification email', error);
      });

      return {
        user: user[0],
        tenant: tenant[0],
        requiresEmailVerification: true,
        message: 'Signup successful. Please verify your email to continue.',
      };
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
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
      session = await startTransactionSession();

      const limits = await getTenantPlanLimits(adminTenantId);
      const totalUsers = await User.countDocuments({ tenantId: adminTenantId });
      enforceTenantResourceLimit(totalUsers, limits.maxUsers, 'users');

      // Generate password reset token
      const { hashedToken, plainToken } = generatePasswordResetToken();
      const resetExpiry = getPasswordResetExpiry();

      // Security: Extract only allowed fields from userData to prevent privilege escalation
      const allowedRoles = ['facility_manager', 'manager', 'cashier', 'stock_clerk', 'viewer'];
      const userRole = userData.role && allowedRoles.includes(userData.role) ? userData.role : 'viewer';
      
      // Prevent users from registering as super_admin or admin
      if (userData.role === 'super_admin' || userData.role === 'admin') {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot create users with super_admin or admin roles through this endpoint');
      }
      
      // Create user with reset token
      const user = await User.create([{
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role: userRole,
        branch: userData.branch,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        isEmailVerified: true,
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
        logger.error('Failed to send invitation email', error);
      });

      return { 
        user: user[0], 
        message: 'User created successfully. Invitation email sent.' 
      };
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
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

    if (!user.isEmailVerified) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Please verify your email before logging in');
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

  static async verifyEmail(token: string) {
    const hashedToken = hashEmailVerificationToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return { message: 'Email verified successfully' };
  }

  static async resendVerificationEmail(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const { hashedToken, plainToken } = generateEmailVerificationToken();
    const verificationExpiry = getEmailVerificationExpiry();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = verificationExpiry;
    await user.save({ validateBeforeSave: false });

    const tenant = await Tenant.findById(user.tenantId);
    const tenantName = tenant?.name || 'Stock Inventory';

    await emailService.sendEmailVerificationEmail(
      user.email,
      user.firstName,
      plainToken,
      tenantName
    );

    return { message: 'Verification email sent successfully' };
  }
}
