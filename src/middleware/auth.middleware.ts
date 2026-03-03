import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'You are not logged in! Please log in to get access.'));
  }

  const decoded: any = jwt.verify(token, env.JWT_ACCESS_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'The user belonging to this token no longer exists.'));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'User recently changed password! Please log in again.'));
  }

  if (!currentUser.isActive) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'User account is deactivated.'));
  }

  // Add user and tenantId to request
  req.user = currentUser as any;
  req.tenantId = decoded.tenantId;
  next();
});
