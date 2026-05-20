import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant.model';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const getAllTenants = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  
  // Only super_admin and facility_manager can view all tenants
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or facility manager can view all tenants');
  }

  const result = await Tenant.paginate(
    {},
    {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 }
    }
  );

  // Enhance with user counts
  const docsWithUserCounts = await Promise.all(
    result.docs.map(async (tenant: any) => {
      const userCount = await User.countDocuments({ tenantId: tenant._id });
      return {
        ...tenant.toJSON(),
        userCount
      };
    })
  );

  res.status(StatusCodes.OK).json(
    ApiResponse.success(
      { ...result, docs: docsWithUserCounts },
      'Tenants retrieved successfully'
    )
  );
});

export const getTenantById = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tenant not found');
  }

  // Only super_admin, facility_manager, or the tenant's own user can view
  const isPrivileged = req.user?.role === 'super_admin' || req.user?.role === 'facility_manager';
  if (!isPrivileged && req.user?.tenantId?.toString() !== req.params.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this tenant');
  }

  const userCount = await User.countDocuments({ tenantId: tenant._id });
  
  res.status(StatusCodes.OK).json(
    ApiResponse.success(
      { ...tenant.toJSON(), userCount },
      'Tenant retrieved successfully'
    )
  );
});

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, address, city, country, billingPlan, isActive, maxUsers, maxBranches } = req.body;

  // Only super_admin and facility_manager can update tenants
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or facility manager can update tenants');
  }

  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tenant not found');
  }

  // Update allowed fields
  if (name !== undefined) tenant.name = name;
  if (email !== undefined) tenant.email = email;
  if (phone !== undefined) tenant.phone = phone;
  if (address !== undefined) tenant.address = address;
  if (city !== undefined) tenant.city = city;
  if (country !== undefined) tenant.country = country;
  if (billingPlan !== undefined) {
    if (!['free', 'starter', 'professional', 'enterprise'].includes(billingPlan)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid billing plan');
    }
    tenant.billingPlan = billingPlan;
  }
  if (isActive !== undefined) tenant.isActive = isActive;
  if (maxUsers !== undefined) tenant.maxUsers = maxUsers;
  if (maxBranches !== undefined) tenant.maxBranches = maxBranches;

  const updatedTenant = await tenant.save();
  const userCount = await User.countDocuments({ tenantId: updatedTenant._id });

  res.status(StatusCodes.OK).json(
    ApiResponse.success(
      { ...updatedTenant.toJSON(), userCount },
      'Tenant updated successfully'
    )
  );
});

export const updateSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const { plan } = req.body;

  // Only super_admin or facility_manager can update subscription plans
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or facility manager can update subscription plans');
  }

  if (req.user?.role === 'facility_manager' && req.user?.tenantId?.toString() !== req.params.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Facility manager can only update their own tenant subscription plan');
  }

  if (!plan || !['free', 'starter', 'professional', 'enterprise'].includes(plan)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid billing plan');
  }

  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tenant not found');
  }

  // Update plan limits based on plan type
  const planLimits = {
    free: { maxUsers: 1, maxBranches: 1 },
    starter: { maxUsers: 3, maxBranches: 2 },
    professional: { maxUsers: 10, maxBranches: 5 },
    enterprise: { maxUsers: 999, maxBranches: 999 }
  };

  tenant.billingPlan = plan;
  tenant.maxUsers = planLimits[plan as keyof typeof planLimits].maxUsers;
  tenant.maxBranches = planLimits[plan as keyof typeof planLimits].maxBranches;

  const updatedTenant = await tenant.save();
  const userCount = await User.countDocuments({ tenantId: updatedTenant._id });

  res.status(StatusCodes.OK).json(
    ApiResponse.success(
      { ...updatedTenant.toJSON(), userCount },
      `Subscription plan updated to ${plan}`
    )
  );
});

export const getTenantStats = asyncHandler(async (req: Request, res: Response) => {
  // Only super_admin and facility_manager can view all stats
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'facility_manager') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only super admin or facility manager can view tenant stats');
  }

  const tenants = await Tenant.find();
  
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.isActive).length,
    byPlan: {
      free: tenants.filter(t => t.billingPlan === 'free').length,
      starter: tenants.filter(t => t.billingPlan === 'starter').length,
      professional: tenants.filter(t => t.billingPlan === 'professional').length,
      enterprise: tenants.filter(t => t.billingPlan === 'enterprise').length
    }
  };

  res.status(StatusCodes.OK).json(ApiResponse.success(stats, 'Tenant stats retrieved successfully'));
});
