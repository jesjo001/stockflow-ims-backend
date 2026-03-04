import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as generateAwsSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

// Initialize S3 client
const s3 = new S3Client({
  region: env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const getSignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const { key, content_type } = req.body;
  
  if (!key) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Key is required');
  }
  
  if (!content_type) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Content type is required');
  }
  
  if (!env.AWS_S3_BUCKET_NAME) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'S3 bucket not configured');
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: content_type,
  });

  const signedUrl = await generateAwsSignedUrl(s3, command, {
    expiresIn: 60 * 5, // 5 minutes
  });

  res.status(StatusCodes.OK).json(ApiResponse.success({ signedUrl }, 'Signed URL generated successfully'));
});

// Get signed URL for viewing (reading) an image from S3
export const getViewSignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.body;
  
  if (!key) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Key is required');
  }
  
  if (!env.AWS_S3_BUCKET_NAME) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'S3 bucket not configured');
  }

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await generateAwsSignedUrl(s3, command, {
    expiresIn: 60 * 60, // 1 hour
  });

  res.status(StatusCodes.OK).json(ApiResponse.success({ signedUrl }, 'View signed URL generated successfully'));
});

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
