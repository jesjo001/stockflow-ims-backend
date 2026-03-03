import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    customer: z.string().optional(),
    items: z.array(z.object({
      product: z.string().min(1),
      quantity: z.number().int().positive(),
    })).min(1),
    discountType: z.enum(['fixed', 'percentage']).default('fixed'),
    discountValue: z.number().min(0).default(0),
    paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'credit', 'mixed']),
    amountPaid: z.number().min(0),
  }),
});
