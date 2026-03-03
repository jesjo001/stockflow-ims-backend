import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoryService.createCategory(req.body, req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(category, 'Category created successfully', StatusCodes.CREATED));
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await CategoryService.getCategories(req.query, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(categories, 'Categories retrieved successfully'));
});
