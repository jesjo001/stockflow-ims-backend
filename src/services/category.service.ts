import { Category, ICategoryDocument } from '../models/Category.model';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { cache } from '../utils/cache';

export class CategoryService {
  static async createCategory(data: any, tenantId: string) {
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/ /g, '-');
    }
    const category = await Category.create({ ...data, tenantId });
    await cache.flush(); // Invalidate cached category query variants
    return category;
  }

  static async getCategories(filters: any = {}, tenantId: string) {
    const cacheKey = `categories_${JSON.stringify(filters)}_${tenantId}`;
    const cachedData = await cache.get(cacheKey);

    if (cachedData) return cachedData;

    const categories = await Category.find({ ...filters, tenantId }).populate('parentId').lean();
    await cache.set(cacheKey, categories, 3600); // Cache for 1 hour
    return categories;
  }
}
