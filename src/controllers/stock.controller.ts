import { Request, Response } from 'express';
import { StockService } from '../services/stock.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const movement = await StockService.adjustStock(req.body, req.user._id.toString(), req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(movement, 'Stock adjusted successfully'));
});

export const getStockLevels = asyncHandler(async (req: Request, res: Response) => {
  const branchId = req.user.branch?.toString();
  const stocks = await StockService.getAllStockLevels(branchId as string, req.user.tenantId.toString(), req.query);
  res.status(StatusCodes.OK).json(ApiResponse.success(stocks, 'Stock levels retrieved successfully'));
});
