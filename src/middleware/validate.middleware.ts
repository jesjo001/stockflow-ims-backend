import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Validation Error', error.issues));
      }
      next(error);
    }
  };
};
