import { Request, Response } from 'express';
import { SaleService } from '../services/sale.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  // Get branch - from user or request body
  let branchId = req.user.branch?.toString();
  
  // If branch not in user, try to get from request body
  if (!branchId && req.body.branch) {
    branchId = req.body.branch;
  }

  // Branch is required
  if (!branchId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Branch information is required. Please assign a branch to your account.');
  }

  const sale = await SaleService.createSale(req.body, req.user._id.toString(), branchId, req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(sale, 'Sale completed successfully', StatusCodes.CREATED));
});

export const getSales = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  const result = await SaleService.getSales(filters, { page, limit }, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.paginated(result.docs, {
    totalDocs: result.totalDocs,
    limit: result.limit,
    totalPages: result.totalPages,
    page: result.page,
  }, 'Sales retrieved successfully'));
});
