import { StatusCodes } from 'http-status-codes';

export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data?: T,
    public meta?: any,
    public statusCode: number = StatusCodes.OK
  ) {}

  static success<T>(data: T, message: string = 'Success', statusCode = StatusCodes.OK): ApiResponse<T> {
    return new ApiResponse(true, message, data, undefined, statusCode);
  }

  static paginated<T>(data: T[], meta: any, message: string = 'Success'): ApiResponse<T[]> {
    return new ApiResponse(true, message, data, meta, StatusCodes.OK);
  }
}
