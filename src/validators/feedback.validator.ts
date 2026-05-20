import { z } from 'zod';

export const feedbackValidators = {
  createFeedback: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
    message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
    category: z.enum(['bug', 'feature', 'improvement', 'other']).optional(),
    rating: z.number().min(1).max(5).optional(),
    attachments: z.array(z.string()).optional(),
  }),

  respondToFeedback: z.object({
    response: z.string().min(10, 'Response must be at least 10 characters').max(5000),
  }),

  updateFeedbackStatus: z.object({
    status: z.enum(['new', 'read', 'responded', 'closed']),
  }),
};
