import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  // Automatically assign the user's branch if not provided
  if (!req.body.branch && req.user.branch) {
    req.body.branch = req.user.branch;
  }
  const category = await CategoryService.createCategory(req.body, req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(category, 'Category created successfully', StatusCodes.CREATED));
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { branch, ...filters } = req.query;
  const tenantId = req.user?.tenantId?.toString() || req.tenantId?.toString();
  
  // Only super_admin, admin, and facility_manager can specify a different branch
  const canSwitchBranch = req.user?.role === 'super_admin' || req.user?.role === 'admin' || req.user?.role === 'facility_manager';
  
  let queryFilters: any = { ...filters };
  if (branch && canSwitchBranch) {
    queryFilters.branch = branch;
  } else if (req.user?.branch) {
    queryFilters.branch = req.user.branch;
  }
  
  const categories = await CategoryService.getCategories(queryFilters, tenantId);
  res.status(StatusCodes.OK).json(ApiResponse.success(categories, 'Categories retrieved successfully'));
});
