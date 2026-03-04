import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const getSalesSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, branchId } = req.query;
  const summary = await ReportService.getSalesSummary(new Date(startDate as string), new Date(endDate as string), req.user.tenantId.toString(), branchId as string);
  res.status(StatusCodes.OK).json(ApiResponse.success(summary, 'Sales summary retrieved successfully'));
});

export const getValuation = asyncHandler(async (req: Request, res: Response) => {
  const branchId = req.user.branch?.toString();
  const valuation = await ReportService.getInventoryValuation(req.user.tenantId.toString(), branchId);
  res.status(StatusCodes.OK).json(ApiResponse.success(valuation, 'Inventory valuation retrieved successfully'));
});

export const getStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const branchId = req.user.branch?.toString();
  const summary = await ReportService.getStockSummary(req.user.tenantId.toString(), branchId as string);
  res.status(StatusCodes.OK).json(ApiResponse.success(summary, 'Stock summary retrieved successfully'));
});

export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 5 } = req.query;
  const branchId = req.user.branch?.toString();
  const products = await ReportService.getTopProducts(req.user.tenantId.toString(), branchId as string, Number(limit));
  res.status(StatusCodes.OK).json(ApiResponse.success(products, 'Top products retrieved successfully'));
});
