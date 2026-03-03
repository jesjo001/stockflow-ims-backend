import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  // Filter users by tenant
  const filter = { ...req.query, tenantId: req.user.tenantId };
  const users = await User.find(filter).populate('branch');
  res.status(StatusCodes.OK).json(ApiResponse.success(users, 'Users retrieved successfully'));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin and admin can create users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or admin can create users');
  }

  // Ensure tenantId is set to current user's tenant
  const userData = {
    ...req.body,
    tenantId: req.user.tenantId,
  };

  const user = await User.create(userData);
  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(user, 'User created successfully', StatusCodes.CREATED)
  );
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin and admin can update users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or admin can update users');
  }

  // Ensure user is in the same tenant
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  // Update user fields from request body
  Object.assign(user, req.body);

  // If password is being updated, the pre-save hook will handle hashing it
  const updatedUser = await user.save();

  res.status(StatusCodes.OK).json(ApiResponse.success(updatedUser, 'User updated successfully'));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin can delete users
  if (req.user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin can delete users');
  }

  // Ensure user is in the same tenant
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  await User.findByIdAndDelete(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'User deleted successfully'));
});
