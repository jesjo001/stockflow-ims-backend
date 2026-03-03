import { Request, Response } from 'express';
import { BranchService } from '../services/branch.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const branch = await BranchService.createBranch(req.body, req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(branch, 'Branch created successfully', StatusCodes.CREATED));
});

export const getBranches = asyncHandler(async (req: Request, res: Response) => {
  const branches = await BranchService.getBranches(req.query, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(branches, 'Branches retrieved successfully'));
});

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const branchId = Array.isArray(req?.params?.id) ? req.params.id[0] : req.params.id;
  const branch = await BranchService.updateBranch(branchId, req.body, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(branch, 'Branch updated successfully'));
});
