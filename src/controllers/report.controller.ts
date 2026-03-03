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
  const valuation = await ReportService.getInventoryValuation(branchId as string, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(valuation, 'Inventory valuation retrieved successfully'));
});
