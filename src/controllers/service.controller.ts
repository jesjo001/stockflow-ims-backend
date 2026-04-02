import { Request, Response } from 'express';
import { Service } from '../models/Service.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.create({
    ...req.body,
    branch: req.user.branch,
    tenantId: req.user.tenantId
  });
  res.status(StatusCodes.CREATED).json(ApiResponse.success(service, 'Service logged successfully', StatusCodes.CREATED));
});

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  // Allow super_admin to filter by a specific branch via query param; fall back to the user's own branch
  const branchFilter = (filters.branch as string) || req.user.branch;
  const query: Record<string, unknown> = { ...filters, tenantId: req.user.tenantId };
  if (branchFilter) query.branch = branchFilter;
  const result = await (Service as any).paginate(query, { page, limit, sort: { createdAt: -1 } });
  res.status(StatusCodes.OK).json(ApiResponse.success(result, 'Services retrieved successfully'));
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, req.body, { new: true, runValidators: true });
  if (!service) throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  res.status(StatusCodes.OK).json(ApiResponse.success(service, 'Service updated successfully'));
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!service) throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Service deleted successfully'));
});
