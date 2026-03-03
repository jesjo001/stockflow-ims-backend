import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.create({ ...req.body, tenantId: req.user.tenantId });
  res.status(StatusCodes.CREATED).json(ApiResponse.success(supplier, 'Supplier created successfully', StatusCodes.CREATED));
});

export const getSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const suppliers = await Supplier.find({ ...req.query, tenantId: req.user.tenantId });
  res.status(StatusCodes.OK).json(ApiResponse.success(suppliers, 'Suppliers retrieved successfully'));
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!supplier) throw new ApiError(StatusCodes.NOT_FOUND, 'Supplier not found');
  res.status(StatusCodes.OK).json(ApiResponse.success(supplier, 'Supplier retrieved successfully'));
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, req.body, { new: true, runValidators: true });
  if (!supplier) throw new ApiError(StatusCodes.NOT_FOUND, 'Supplier not found');
  res.status(StatusCodes.OK).json(ApiResponse.success(supplier, 'Supplier updated successfully'));
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!supplier) throw new ApiError(StatusCodes.NOT_FOUND, 'Supplier not found');
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Supplier deleted successfully'));
});
