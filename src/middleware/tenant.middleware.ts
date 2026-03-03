import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to ensure tenant isolation
 * Validates that user's tenantId matches the token tenantId
 * and adds tenantId to request for all subsequent operations
 */
export const ensureTenant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.tenantId) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required'));
  }

  // Ensure user's tenantId matches token tenantId
  if (req.user.tenantId.toString() !== req.tenantId.toString()) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'Tenant mismatch'));
  }

  // Make tenantId accessible to all downstream handlers
  (req as any).tenantId = req.user.tenantId;
  next();
});

/**
 * Helper function to add tenantId filter to query objects
 */
export const addTenantFilter = (filter: any, tenantId: string) => {
  return {
    ...filter,
    tenantId,
  };
};
