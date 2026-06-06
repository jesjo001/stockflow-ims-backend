import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['super_admin', 'admin', 'facility_manager', 'manager', 'cashier', 'stock_clerk', 'viewer', 'affiliate']).optional(),
    phone: z.string().optional(),
    branch: z.string().optional(),
    affiliateCode: z.string().trim().min(3).max(32).optional(),
  }),
});

export const affiliateRegisterSchema = z.object({
  body: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(5),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});
