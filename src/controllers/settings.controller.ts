import { Request, Response } from 'express';
import { Settings } from '../models/Settings.model';
import { Tenant } from '../models/Tenant.model';
import { User } from '../models/User.model';
import { AffiliateService } from '../services/affiliate.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcryptjs';

/** GET /settings — returns tenant + per-tenant settings merged */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId.toString();

  // Upsert: create default settings doc if not exists
  let settings = await Settings.findOne({ tenantId });
  if (!settings) {
    const tenant = await Tenant.findById(tenantId);
    settings = await Settings.create({
      tenantId,
      companyName: tenant?.name,
      email: tenant?.email,
      phone: tenant?.phone,
      address: tenant?.address,
      logo: tenant?.logo,
    });
  }

  res.status(StatusCodes.OK).json(ApiResponse.success(settings, 'Settings retrieved successfully'));
});

/** PATCH /settings — update any settings fields */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId.toString();

  // Check if affiliate percentage is being updated - only super_admin and facility_manager can do this
  if (req.body.defaultAffiliatePercentage !== undefined) {
    if (req.user.role !== 'super_admin' && req.user.role !== 'facility_manager') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin and facility manager can update default affiliate commission percentage');
    }
    await AffiliateService.setDefaultAffiliatePercentage(req.body.defaultAffiliatePercentage);
    delete req.body.defaultAffiliatePercentage; // Remove from regular settings update
  }

  const settings = await Settings.findOneAndUpdate(
    { tenantId },
    { $set: req.body },
    { new: true, upsert: true, runValidators: true }
  );

  // Sync company-level fields back to Tenant record
  const syncFields: Record<string, string> = {
    companyName: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    logo: 'logo',
  };
  const tenantUpdate: Record<string, unknown> = {};
  for (const [settingsKey, tenantKey] of Object.entries(syncFields)) {
    if (req.body[settingsKey] !== undefined) {
      tenantUpdate[tenantKey] = req.body[settingsKey];
    }
  }
  if (Object.keys(tenantUpdate).length > 0) {
    await Tenant.findByIdAndUpdate(tenantId, { $set: tenantUpdate });
  }

  res.status(StatusCodes.OK).json(ApiResponse.success(settings, 'Settings updated successfully'));
});

/** POST /settings/change-password */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current and new password are required');
  }
  if (newPassword.length < 8) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New password must be at least 8 characters');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Password changed successfully'));
});
