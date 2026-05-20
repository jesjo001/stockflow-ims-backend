import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

// Helper to resolve branch ID with role-based access control
const getBranchId = (branchParam: string | undefined, userBranch: string | undefined, userRole: string | undefined): string | undefined => {
  const canSwitchBranch = userRole === 'super_admin' || userRole === 'admin' || userRole === 'facility_manager';
  return (branchParam && canSwitchBranch) ? branchParam : userBranch;
};

export const getSalesSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, branchId: branchParam } = req.query;
  
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setUTCHours(23, 59, 59, 999);
  
  const branchId = getBranchId(branchParam as string, req.user.branch?.toString(), req.user.role);
  const summary = await ReportService.getSalesSummary(start, end, req.user.tenantId.toString(), branchId);
  res.status(StatusCodes.OK).json(ApiResponse.success(summary, 'Sales summary retrieved successfully'));
});

export const getValuation = asyncHandler(async (req: Request, res: Response) => {
  const { branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const valuation = await ReportService.getInventoryValuation(req.user.tenantId.toString(), branchId);
  res.status(StatusCodes.OK).json(ApiResponse.success(valuation, 'Inventory valuation retrieved successfully'));
});

export const getStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const { branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const summary = await ReportService.getStockSummary(req.user.tenantId.toString(), branchId as string);
  res.status(StatusCodes.OK).json(ApiResponse.success(summary, 'Stock summary retrieved successfully'));
});

export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 5, branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const products = await ReportService.getTopProducts(req.user.tenantId.toString(), branchId as string, Number(limit));
  res.status(StatusCodes.OK).json(ApiResponse.success(products, 'Top products retrieved successfully'));
});

export const getMonthlySales = asyncHandler(async (req: Request, res: Response) => {
  const { year, branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const data = await ReportService.getMonthlySales(req.user.tenantId.toString(), branchId, year ? Number(year) : undefined);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Monthly sales retrieved successfully'));
});

export const getWeeklySales = asyncHandler(async (req: Request, res: Response) => {
  const { weeks = 12, branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const data = await ReportService.getWeeklySales(req.user.tenantId.toString(), branchId, Number(weeks));
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Weekly sales retrieved successfully'));
});

export const getDailySales = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30, branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const data = await ReportService.getDailySales(req.user.tenantId.toString(), branchId, Number(days));
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Daily sales retrieved successfully'));
});

export const getPnLSummary = asyncHandler(async (req: Request, res: Response) => {
  const { year, branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const data = await ReportService.getPnLSummary(req.user.tenantId.toString(), branchId, year ? Number(year) : undefined);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'P&L summary retrieved successfully'));
});

export const getStockByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { branch } = req.query;
  const branchId = getBranchId(branch as string, req.user.branch?.toString(), req.user.role);
  const data = await ReportService.getStockByCategory(req.user.tenantId.toString(), branchId);
  res.status(StatusCodes.OK).json(ApiResponse.success(data, 'Stock by category retrieved successfully'));
});
