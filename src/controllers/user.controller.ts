import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  // If super_admin can view all users across tenants, otherwise filter by tenant
  const filter: any = {};
  
  if (req.user.role === 'super_admin' && req.query.tenantId) {
    // Super admin can filter by specific tenant
    filter.tenantId = req.query.tenantId;
  } else if (req.user.role === 'super_admin') {
    // Super admin viewing all users without tenant filter (for admin dashboard)
    // Allow without tenant filter
  } else {
    // Regular admin/manager can only see users from their tenant
    filter.tenantId = req.user.tenantId;
  }

  // Apply other filters from query params
  Object.keys(req.query).forEach(key => {
    if (key !== 'tenantId' && key !== 'page' && key !== 'limit') {
      filter[key] = req.query[key];
    }
  });

  const { page = 1, limit = 50 } = req.query;
  const result = await User.paginate(filter, {
    page: Number(page),
    limit: Number(limit),
    sort: { createdAt: -1 },
    populate: 'branch'
  });

  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Users retrieved successfully'));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin, admin, and facility_manager can create users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin, admin, or facility manager can create users');
  }

  // Prevent any attempt to create super_admin users from tenant-level endpoints
  if (req.body.role === 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot create users with super_admin role');
  }

  // Ensure tenantId is set to current user's tenant
  const userData = {
    ...req.body,
    tenantId: req.user.tenantId,
  };

  // If no branch is provided, assign the creator's branch
  if (!userData.branch && req.user.branch) {
    userData.branch = req.user.branch;
  }

  const user = await User.create(userData);
  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(user, 'User created successfully', StatusCodes.CREATED)
  );
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin, admin, and facility_manager can update users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin, admin, or facility manager can update users');
  }

  // Prevent privilege escalation - cannot update role to super_admin
  if (req.body.role === 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot update user role to super_admin');
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
  // Only super_admin, admin, and facility_manager can delete users
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin, admin, or facility manager can delete users');
  }

  const filter: any = { _id: req.params.id };
  
  // If not a global super admin, ensure user is in the same tenant
  if (req.user.role !== 'super_admin' || process.env.IS_GLOBAL_SUPER_ADMIN !== 'true') {
    filter.tenantId = req.user.tenantId;
  }

  const user = await User.findOne(filter);
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  await User.findByIdAndDelete(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'User deleted successfully'));
});
