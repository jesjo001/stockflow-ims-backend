import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { generateSKU } from '../utils/generateSKU';
import { generateBarcode } from '../utils/generateBarcode';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { cache } from '../utils/cache';
import { enforceTenantResourceLimit, getTenantPlanLimits } from '../utils/planLimits';

export class ProductService {
  static async createProduct(data: any, userId: string, tenantId: string) {
    const limits = await getTenantPlanLimits(tenantId);
    const totalProducts = await Product.countDocuments({ tenantId });
    enforceTenantResourceLimit(totalProducts, limits.maxProducts, 'products');

    if (!data.sku) data.sku = generateSKU(data.name, data.category);
    if (!data.barcode) data.barcode = generateBarcode();
    if (!data.slug) data.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!data.unit) data.unit = 'pcs'; // Default unit
    
    data.createdBy = userId;
    data.tenantId = tenantId;
    const { quantity, ...productData } = data;

    const product = await Product.create(productData);
    
    await StockLevel.create({
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

  static async getProducts(filters: any, options: any, tenantId?: string) {
    const { search, ...filterFields } = filters;
    const tenantFilters: any = tenantId ? { ...filterFields, tenantId } : { ...filterFields };
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

    // Populate stock levels for each product
    const productsWithStock = await Promise.all(
      result.docs.map(async (product: any) => {
        const stockLevel = await StockLevel.findOne({
          product: product._id,
          branch: product.branch._id || product.branch,
          tenantId
        }).lean();
        return {
          ...product,
          stock: stockLevel?.quantity || 0,
          status: this.getStockStatus(stockLevel?.quantity || 0, product.reorderPoint)
        };
      })
    );

   if(!search) await cache.set(cacheKey, { ...result, docs: productsWithStock }, 60);
    return { ...result, docs: productsWithStock };
  }

  static async getProductById(id: string, tenantId?: string) {
    const cacheKey = `product_${id}_${tenantId || 'public'}`;
    const cachedProduct = await cache.get(cacheKey);

    if (cachedProduct) return cachedProduct;

    const query = tenantId ? { _id: id, tenantId } : { _id: id };
    const product = await Product.findOne(query).populate(['category', 'branch']).lean();
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
    
    // Fetch stock level
    const stockLevel = await StockLevel.findOne({
      product: product._id,
      branch: product.branch._id || product.branch,
      tenantId
    }).lean();

    const productWithStock = {
      ...product,
      stock: stockLevel?.quantity || 0,
      status: this.getStockStatus(stockLevel?.quantity || 0, product.reorderPoint)
    };

    await cache.set(cacheKey, productWithStock, 300);
    return productWithStock;
  }

  static async updateProduct(id: string, data: any, tenantId: string, userId?: string) {
    const product = await Product.findOne({ _id: id, tenantId });
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');

    const { quantity, ...productData } = data;

    // Update product fields
    Object.assign(product, productData);
    await product.save();

    // Handle stock level updates if quantity is provided
    if (quantity !== undefined) {
      const stockLevel = await StockLevel.findOne({ product: id, tenantId });
      if (stockLevel) {
        const previousQty = stockLevel.quantity;
        stockLevel.quantity = quantity;
        stockLevel.lastUpdated = new Date();
        await stockLevel.save();

        // Create stock movement record if quantity changed
        if (previousQty !== quantity) {
          await StockMovement.create({
            product: id,
            branch: product.branch,
            tenantId: tenantId,
            type: 'adjustment',
            quantity: quantity - previousQty,
            previousQty: previousQty,
            newQty: quantity,
            createdBy: userId || product.createdBy
          });
        }
      }
    }

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

  static async toggleVisibility(id: string, tenantId: string) {
    const product = await Product.findOne({ _id: id, tenantId });
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');

    product.isVisible = !product.isVisible;
    await product.save();

    await cache.del(`product_${id}_${tenantId}`);
    await cache.del('all_products');
    return product;
  }

  private static getStockStatus(quantity: number, reorderPoint: number): string {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= reorderPoint) return 'low-stock';
    return 'in-stock';
  }
}
