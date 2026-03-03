import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { Tenant } from '../models/Tenant.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

/**
 * Register a new super admin (initial setup)
 * Only used for first super admin registration
 */
export const registerSuperAdmin = asyncHandler(async (req: Request, res: Response) => {
  const data = await AuthService.registerSuperAdmin(req.body);
  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(data, 'Super Admin registered successfully', StatusCodes.CREATED)
  );
});

/**
 * Add a new user to the system
 * Only super_admin or admin can add users
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin and admin can register users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or admin can register users');
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
