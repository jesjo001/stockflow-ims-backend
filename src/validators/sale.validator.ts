import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    customer: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    customerUserId: z.string().optional(),
    items: z.array(z.object({
      product: z.string().min(1),
      quantity: z.number().int().positive(),
    })).min(1),
    discountType: z.enum(['fixed', 'percentage']).default('fixed'),
    discountValue: z.number().min(0).default(0),
    paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'mixed']),
    amountPaid: z.number().min(0),
    note: z.string().optional(),
  }),
});

export const createShopCheckoutSchema = z.object({
  body: z.object({
    customerEmail: z.string().email('Invalid email address'),
    customerName: z.string().min(1).optional(),
    customerPhone: z.string().min(1).optional(),
    customerUserId: z.string().optional(),
    redirectUrl: z.string().url('Invalid redirect URL'),
    paymentMethod: z.enum(['card', 'bank_transfer', 'mobile_money']),
    currency: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    items: z.array(z.object({
      product: z.string().min(1),
      quantity: z.number().int().positive(),
    })).min(1),
  }),
});
