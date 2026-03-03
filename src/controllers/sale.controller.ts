import { Request, Response } from 'express';
import { SaleService } from '../services/sale.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const branchId = req.user.branch?.toString();
  const sale = await SaleService.createSale(req.body, req.user._id.toString(), branchId as string, req.user.tenantId.toString());
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
