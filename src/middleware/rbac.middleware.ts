import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Role } from '../types';

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
};
