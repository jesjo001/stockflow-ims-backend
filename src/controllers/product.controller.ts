import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No files were uploaded.');
  }

  // With multer-s3, the public URL is available on the `location` property
  const imageUrls = (req.files as any[]).map(file => file.location);

  res.status(StatusCodes.OK).json(ApiResponse.success(imageUrls, 'Images uploaded successfully'));
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  // The 'images' field in req.body should now be an array of URLs
  const product = await ProductService.createProduct(req.body, req.user._id.toString(), req.user.tenantId.toString());
  res.status(StatusCodes.CREATED).json(ApiResponse.success(product, 'Product created successfully', StatusCodes.CREATED));
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  const result = await ProductService.getProducts(filters, { page, limit }, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.paginated(result.docs, {
    totalDocs: result.totalDocs,
    limit: result.limit,
    totalPages: result.totalPages,
    page: result.page,
  }, 'Products retrieved successfully'));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.getProductById(String(req.params.id), req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(product, 'Product retrieved successfully'));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.updateProduct(String(req.params.id), req.body, req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(product, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await ProductService.deleteProduct(String(req.params.id), req.user.tenantId.toString());
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Product deleted successfully'));
});
