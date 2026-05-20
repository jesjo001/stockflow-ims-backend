import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { FeedbackService } from '../services/feedback.service';
import { feedbackValidators } from '../validators/feedback.validator';

/**
 * Create new feedback (public endpoint)
 */
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const validation = feedbackValidators.createFeedback.safeParse(req.body);
  
  if (!validation.success) {
    const errorMessage = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ApiError(StatusCodes.BAD_REQUEST, errorMessage);
  }

  // Use tenantId from user if authenticated, otherwise use provided tenantId
  const tenantId = (req as any).user?.tenantId || req.body.tenantId;

  if (!tenantId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tenant ID is required');
  }

  const feedback = await FeedbackService.createFeedback(tenantId, validation.data);

  res.status(StatusCodes.CREATED).json(
    ApiResponse.success(feedback, 'Feedback submitted successfully', StatusCodes.CREATED)
  );
});

/**
 * Get all feedback for a tenant (admin only)
 */
export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { page = 1, limit = 10, status, category } = req.query;

  // Only admins can view feedback
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can view feedback');
  }

  const feedbackData = await FeedbackService.getFeedback(
    user.tenantId,
    parseInt(page as string) || 1,
    parseInt(limit as string) || 10,
    status as string,
    category as string
  );

  res.status(StatusCodes.OK).json(
    ApiResponse.success(feedbackData, 'Feedback retrieved successfully', StatusCodes.OK)
  );
});

/**
 * Get single feedback by ID
 */
export const getFeedbackById = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback ID is required');
  }

  const feedback = await FeedbackService.getFeedbackById(id, user.tenantId);

  res.status(StatusCodes.OK).json(
    ApiResponse.success(feedback, 'Feedback retrieved successfully', StatusCodes.OK)
  );
});

/**
 * Send response to feedback
 */
export const respondToFeedback = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback ID is required');
  }

  // Only admins can respond to feedback
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can respond to feedback');
  }

  const validation = feedbackValidators.respondToFeedback.safeParse(req.body);
  
  if (!validation.success) {
    const errorMessage = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ApiError(StatusCodes.BAD_REQUEST, errorMessage);
  }

  const feedback = await FeedbackService.respondToFeedback(
    id,
    user.tenantId,
    validation.data.response.trim(),
    user._id
  );

  res.status(StatusCodes.OK).json(
    ApiResponse.success(feedback, 'Response sent successfully', StatusCodes.OK)
  );
});

/**
 * Update feedback status
 */
export const updateFeedbackStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback ID is required');
  }

  // Only admins can update feedback status
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can update feedback status');
  }

  const validation = feedbackValidators.updateFeedbackStatus.safeParse(req.body);
  
  if (!validation.success) {
    const errorMessage = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ApiError(StatusCodes.BAD_REQUEST, errorMessage);
  }

  const feedback = await FeedbackService.updateFeedbackStatus(id, user.tenantId, validation.data.status);

  res.status(StatusCodes.OK).json(
    ApiResponse.success(feedback, 'Feedback status updated successfully', StatusCodes.OK)
  );
});

/**
 * Delete feedback
 */
export const deleteFeedback = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback ID is required');
  }

  // Only admins can delete feedback
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can delete feedback');
  }

  await FeedbackService.deleteFeedback(id, user.tenantId);

  res.status(StatusCodes.OK).json(
    ApiResponse.success(null, 'Feedback deleted successfully', StatusCodes.OK)
  );
});

/**
 * Get feedback statistics
 */
export const getFeedbackStats = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Only admins can view stats
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can view feedback statistics');
  }

  const stats = await FeedbackService.getFeedbackStats(user.tenantId);

  res.status(StatusCodes.OK).json(
    ApiResponse.success(stats, 'Statistics retrieved successfully', StatusCodes.OK)
  );
});
