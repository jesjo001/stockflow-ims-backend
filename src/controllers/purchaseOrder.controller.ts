import { Request, Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { PurchaseOrderService } from '../services/purchaseOrder.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await PurchaseOrderService.createPurchaseOrder(req.body, req.user._id.toString(), req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(po, 'Purchase order created successfully', StatusCodes.CREATED));
});

export const getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const { branch, ...otherFilters } = req.query;
  
  // Only super_admin, admin, and facility_manager can specify a different branch
  const canSwitchBranch = req.user?.role === 'super_admin' || req.user?.role === 'admin' || req.user?.role === 'facility_manager';
  
  let queryFilters: any = { ...otherFilters, tenantId: req.user.tenantId };
  if (branch && canSwitchBranch) {
    queryFilters.branch = branch;
  } else if (req.user?.branch) {
    queryFilters.branch = req.user.branch;
  }
  
  const pos = await PurchaseOrder.find(queryFilters).populate(['supplier', 'branch', 'createdBy']);
  res.status(StatusCodes.OK).json(ApiResponse.success(pos, 'Purchase orders retrieved successfully'));
});

export const receiveGoods = asyncHandler(async (req: Request, res: Response) => {
  const po = await PurchaseOrderService.receiveGoods(String(req.params.id), req.body.items, req.user._id.toString(), req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(po, 'Goods received and stock updated'));
});
