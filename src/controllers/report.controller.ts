import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const getSalesSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, branchId } = req.query;
  
  // Parse dates and adjust end date to include the entire day
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setUTCHours(23, 59, 59, 999); // Set to end of day in UTC
  
  const userBranchId = branchId as string || req.user.branch?.toString();
  const summary = await ReportService.getSalesSummary(start, end, req.user.tenantId.toString(), userBranchId);
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

export const getMonthlySales = asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.query;
  const branchId = req.user.branch?.toString();
  const data = await ReportService.getMonthlySales(req.user.tenantId.toString(), branchId, year ? Number(year) : undefined);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Monthly sales retrieved successfully'));
});

export const getPnLSummary = asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.query;
  const branchId = req.user.branch?.toString();
  const data = await ReportService.getPnLSummary(req.user.tenantId.toString(), branchId, year ? Number(year) : undefined);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'P&L summary retrieved successfully'));
});

export const getStockByCategory = asyncHandler(async (req: Request, res: Response) => {
  const branchId = req.user.branch?.toString();
  const data = await ReportService.getStockByCategory(req.user.tenantId.toString(), branchId);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Stock by category retrieved successfully'));
});
