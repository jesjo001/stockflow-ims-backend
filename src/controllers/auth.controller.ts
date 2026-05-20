import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { Tenant } from '../models/Tenant.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

/**
 * Register the initial super admin account (public signup).
 * This endpoint creates the tenant and stores the new user as super_admin.
 */
export const registerOwner = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.role && req.body.role !== 'super_admin') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role for super admin registration');
  }

  const data = await AuthService.registerSuperAdmin(req.body);
  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(data, 'Super admin registered. Verification email sent.', StatusCodes.CREATED)
  );
});

/**
 * Add a new user to the system
 * Only super_admin or admin can add users
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin, admin, and facility_manager can register users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin, admin, or facility manager can register users');
  }

  // Prevent any attempt to create super_admin or admin users
  if (req.body.role === 'super_admin' || req.body.role === 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot create users with super_admin or admin roles');
  }

  // Get tenant name for email
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new ApiError(StatusCodes.NOT_FOUND, 'Tenant not found');

  // Register user with admin's tenant
  const data = await AuthService.register(req.body, req.user.tenantId.toString(), tenant.name);
  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(data, 'User created successfully. Invitation email sent.', StatusCodes.CREATED)
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const data = await AuthService.login(email, password);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'User logged in successfully'));
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const data = await AuthService.refreshAccessToken(refreshToken);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Token refreshed successfully'));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logout(req.user._id.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'User logged out successfully'));
});

/**
 * Reset password using reset token
 * Used by new users to set password or existing users to reset forgotten password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Token and new password are required');
  }

  const data = await AuthService.resetPassword(token, newPassword);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Password reset successfully'));
});

/**
 * Forgot password - send reset email
 * Used by users who forgot their password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required');
  }

  const data = await AuthService.forgotPassword(email);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Password reset email sent'));
});

/**
 * Verify email using verification token from signup email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Verification token is required');
  }

  const data = await AuthService.verifyEmail(token);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Email verified successfully'));
});

/**
 * Resend email verification for unverified users
 */
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required');
  }

  const data = await AuthService.resendVerificationEmail(email);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Verification email sent'));
});
