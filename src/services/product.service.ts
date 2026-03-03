import { Product, IProductDocument } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { generateSKU } from '../utils/generateSKU';
import { generateBarcode } from '../utils/generateBarcode';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { cache } from '../utils/cache';

export class ProductService {
  static async createProduct(data: any, userId: string, tenantId: string) {
    let session: any = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      
      if (!data.sku) data.sku = generateSKU(data.name, data.category);
      if (!data.barcode) data.barcode = generateBarcode();
      
      data.createdBy = userId;
      data.tenantId = tenantId;
      const { quantity, ...productData } = data;

      const product = (await Product.create([productData], { session }))[0];
      
      const stockLevel = (await StockLevel.create([{
        product: product._id,
        branch: data.branch,
        tenantId: tenantId,
        quantity: quantity || 0
      }], { session }))[0];

      if (quantity > 0) {
        await StockMovement.create([{
          product: product._id,
          branch: data.branch,
          tenantId: tenantId,
          type: 'initial',
          quantity: quantity,
          stockLevel: stockLevel._id
        }], { session });
      }

      await session.commitTransaction();
      
      await cache.del('all_products');
      return product;
    } catch (error) {
      if (session) await session.abortTransaction();
      throw error;
    } finally {
      if (session) session.endSession();
    }
  }

  static async getProducts(filters: any, options: any, tenantId: string) {
    const tenantFilters = { ...filters, tenantId };
    const cacheKey = `products_${JSON.stringify(tenantFilters)}_${JSON.stringify(options)}`;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    const result = await (Product as any).paginate(tenantFilters, {
      ...options,
      populate: ['category', 'branch'],
      sort: { createdAt: -1 },
      lean: true
    });

    await cache.set(cacheKey, result, 60);
    return result;
  }

  static async getProductById(id: string, tenantId: string) {
    const cacheKey = `product_${id}_${tenantId}`;
    const cachedProduct = await cache.get(cacheKey);

    if (cachedProduct) return cachedProduct;

    const product = await Product.findOne({ _id: id, tenantId }).populate(['category', 'branch']).lean();
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
    
    await cache.set(cacheKey, product, 300);
    return product;
  }

  static async updateProduct(id: string, data: any, tenantId: string) {
    const product = await Product.findOne({ _id: id, tenantId });
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');

    Object.assign(product, data);
    await product.save();

    await cache.del(`product_${id}_${tenantId}`);
    await cache.del('all_products');
    return product;
  }

  static async deleteProduct(id: string, tenantId: string) {
    const product = await Product.findOne({ _id: id, tenantId });
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');

    await product.deleteOne();

    await cache.del(`product_${id}_${tenantId}`);
    await cache.del('all_products');
  }
}
