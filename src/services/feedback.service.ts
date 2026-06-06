import { Feedback, IFeedbackDocument } from '../models/Feedback.model';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { emailService } from '../utils/email';
import { User } from '../models/User.model';
import { logger } from '../config/logger';

export class FeedbackService {
  /**
   * Create new feedback
   */
  static async createFeedback(
    tenantId: string,
    feedbackData: Partial<IFeedbackDocument>
  ): Promise<IFeedbackDocument> {
    try {
      const feedback = new Feedback({
        tenantId,
        ...feedbackData,
        status: 'new',
      });

      await feedback.save();
      return feedback;
    } catch (error: any) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create feedback: ${error.message}`);
    }
  }

  /**
   * Get all feedback for a tenant with pagination
   */
  static async getFeedback(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    category?: string
  ): Promise<any> {
    try {
      const query: any = { tenantId };

      if (status && status !== 'all') {
        query.status = status;
      }

      if (category && category !== 'all') {
        query.category = category;
      }

      const options = {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: 'respondedBy', select: 'firstName lastName email' }
        ]
      };

      const result = await (Feedback as any).paginate(query, options);
      return result;
    } catch (error: any) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to fetch feedback: ${error.message}`);
    }
  }

  /**
   * Get single feedback by ID
   */
  static async getFeedbackById(feedbackId: string, tenantId: string): Promise<IFeedbackDocument> {
    try {
      const feedback = await Feedback.findOne({ _id: feedbackId, tenantId })
        .populate('respondedBy', 'firstName lastName email');

      if (!feedback) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
      }

      // Mark as read if status is 'new'
      if (feedback.status === 'new') {
        feedback.status = 'read';
        await feedback.save();
      }

      return feedback;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to fetch feedback: ${error.message}`);
    }
  }

  /**
   * Send response to feedback via email
   */
  static async respondToFeedback(
    feedbackId: string,
    tenantId: string,
    response: string,
    respondedByUserId: string
  ): Promise<IFeedbackDocument> {
    try {
      const feedback = await Feedback.findOne({ _id: feedbackId, tenantId });

      if (!feedback) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
      }

      // Get the user who is responding
      const respondingUser = await User.findById(respondedByUserId).select('firstName lastName email');

      if (!respondingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
      }

      // Update feedback with response
      feedback.response = response;
      feedback.respondedBy = respondedByUserId as any;
      feedback.respondedAt = new Date();
      feedback.status = 'responded';

      await feedback.save();

      // Send email response asynchronously
      this.sendFeedbackResponse(
        feedback.email,
        feedback.name,
        feedback.subject,
        response,
        respondingUser.firstName,
        respondingUser.email
      ).catch(error => {
        logger.error('Failed to send feedback response email:', error);
      });

      return feedback;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to respond to feedback: ${error.message}`);
    }
  }

  /**
   * Update feedback status
   */
  static async updateFeedbackStatus(
    feedbackId: string,
    tenantId: string,
    status: 'new' | 'read' | 'responded' | 'closed'
  ): Promise<IFeedbackDocument> {
    try {
      const feedback = await Feedback.findOne({ _id: feedbackId, tenantId });

      if (!feedback) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
      }

      feedback.status = status;
      await feedback.save();

      return feedback;
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to update feedback status: ${error.message}`);
    }
  }

  /**
   * Delete feedback
   */
  static async deleteFeedback(feedbackId: string, tenantId: string): Promise<void> {
    try {
      const result = await Feedback.deleteOne({ _id: feedbackId, tenantId });

      if (result.deletedCount === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
      }
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to delete feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback statistics
   */
  static async getFeedbackStats(tenantId: string): Promise<any> {
    try {
      const stats = await Feedback.aggregate([
        { $match: { tenantId: require('mongoose').Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        new: 0,
        read: 0,
        responded: 0,
        closed: 0,
        averageRating: 0
      };
    } catch (error: any) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to fetch statistics: ${error.message}`);
    }
  }

  /**
   * Send feedback response email
   */
  private static async sendFeedbackResponse(
    toEmail: string,
    userName: string,
    originalSubject: string,
    response: string,
    responderName: string,
    responderEmail: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
            .original-feedback { background-color: #e0e7ff; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .response-text { background-color: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
            .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Feedback!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We have reviewed your feedback regarding <strong>"${originalSubject}"</strong> and wanted to get back to you.</p>
              
              <div class="response-text">
                <h3>Our Response:</h3>
                <p>${response.replace(/\n/g, '<br>')}</p>
              </div>

              <p>Thank you for taking the time to share your thoughts with us. Your feedback helps us improve our service.</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="font-size: 12px; color: #6b7280;">
                <strong>Sent by:</strong> ${responderName}<br>
                <strong>Contact:</strong> ${responderEmail}
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 StockIt System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await emailService.sendEmail({
      to: toEmail,
      subject: `Re: ${originalSubject}`,
      html,
    });
  }
}
