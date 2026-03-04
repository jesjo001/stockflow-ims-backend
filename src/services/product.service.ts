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
    if (!data.sku) data.sku = generateSKU(data.name, data.category);
    if (!data.barcode) data.barcode = generateBarcode();
    if (!data.slug) data.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!data.unit) data.unit = 'pcs'; // Default unit
    
    data.createdBy = userId;
    data.tenantId = tenantId;
    const { quantity, ...productData } = data;

    const product = await Product.create(productData);
    
    const stockLevel = await StockLevel.create({
      product: product._id,
      branch: data.branch,
      tenantId: tenantId,
      quantity: quantity || 0
    });

    if (quantity > 0) {
      await StockMovement.create({
        product: product._id,
        branch: data.branch,
        tenantId: tenantId,
        type: 'opening',
        quantity: quantity,
        previousQty: 0,
        newQty: quantity,
        createdBy: userId
      });
    }
    
    await cache.del('all_products');
    return product;
  }

  static async getProducts(filters: any, options: any, tenantId: string) {
    const { search, ...filterFields } = filters;
    const tenantFilters: any = { ...filterFields, tenantId };
    let cacheKey, cachedData;
    
    // Handle search parameter - search across name, sku, and barcode
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      tenantFilters.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex }
      ];
    } else {
        
    
    cacheKey = `products_${JSON.stringify(tenantFilters)}_${JSON.stringify(options)}`;
    cachedData = await cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    }

    const result = await (Product as any).paginate(tenantFilters, {
      ...options,
      populate: ['category', 'branch', 'name' , 'sku', 'barcode'],
      sort: { createdAt: -1 },
      lean: true
    }); 

   if(!search) await cache.set(cacheKey, result, 60);
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
