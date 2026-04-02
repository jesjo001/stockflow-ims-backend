import { z } from 'zod';

export const paymentValidator = {
  initialize: z.object({
    body: z.object({
      amount: z.number().positive('Amount must be greater than 0'),
      currency: z.string().default('NGN'),
      customerEmail: z.string().email('Invalid email address'),
      customerPhone: z.string().optional(),
      customerName: z.string().optional(),
      redirectUrl: z.string().url('Invalid redirect URL').optional(),
      paymentMethod: z.enum(['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr', 'payattitude']).default('card'),
      saleId: z.string().optional(),
      meta: z.record(z.string(), z.any()).optional(),
    }),
  }),

  refund: z.object({
    body: z.object({
      amount: z.number().positive('Refund amount must be greater than 0').optional(),
      reason: z.string().min(1, 'Refund reason is required').optional(),
    }),
  }),
};
