import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    description: z.string().optional(),
    category: z.string().min(1),
    unit: z.string().min(1),
    costPrice: z.number().positive(),
    sellingPrice: z.number().positive(),
    taxRate: z.number().min(0).optional(),
    mainImage: z.string().optional(),
    images: z.array(z.string()).optional(),
    branch: z.string().min(1),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
});
