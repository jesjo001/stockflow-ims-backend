import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { StatusCodes } from 'http-status-codes';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  err.message = err.message || 'Internal Server Error';

  if (env.NODE_ENV === 'development') {
    logger.error(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    err = new ApiError(StatusCodes.CONFLICT, message);
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ApiError(StatusCodes.BAD_REQUEST, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err = new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token. Please log in again!');
  }
  if (err.name === 'TokenExpiredError') {
    err = new ApiError(StatusCodes.UNAUTHORIZED, 'Your token has expired! Please log in again.');
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors || undefined,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
