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
  const { branch, ...otherQuery } = req.query;
  
  // Only super_admin, admin, and facility_manager can specify a different branch
  const canSwitchBranch = req.user?.role === 'super_admin' || req.user?.role === 'admin' || req.user?.role === 'facility_manager';
  const branchId = (branch && canSwitchBranch) ? (branch as string) : req.user.branch?.toString();
  const stocks = await StockService.getAllStockLevels(branchId as string, req.user.tenantId.toString(), otherQuery);
  res.status(StatusCodes.OK).json(ApiResponse.success(stocks, 'Stock levels retrieved successfully'));
});
