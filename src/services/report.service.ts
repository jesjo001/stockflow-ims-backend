import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { PurchaseOrder } from '../models/PurchaseOrder.model';

export class ReportService {
  static async getSalesSummary(startDate: Date, endDate: Date, tenantId: string, branchId?: string) {
    const query: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
      tenantId
    };
    if (branchId) query.branch = branchId;

    const summary = await Sale.aggregate([
      { $match: query },
      { $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalTax: { $sum: '$taxAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          count: { $sum: 1 }
      }}
    ]);

    return summary[0] || { totalSales: 0, totalTax: 0, totalDiscount: 0, count: 0 };
  }

  static async getInventoryValuation(tenantId: string, branchId?: string) {
    // Get products with their stock levels
    const query: Record<string, unknown> = { tenantId };
    if (branchId) query.branch = branchId;
    
    const stocks = await StockLevel.find(query).populate('product');
    let totalValuation = 0;
    
    for (const stock of stocks) {
      const product = stock.product as any;
      // Use sellingPrice (not costPrice) multiplied by quantity
      totalValuation += (stock.quantity * product.sellingPrice);
    }

    return { totalValuation, date: new Date() };
  }

  static async getStockSummary(tenantId: string, branchId?: string) {
    const products = await Product.find({ tenantId });
    
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const product of products) {
      if (product.stock === 0) {
        outOfStock++;
      } else if (product.stock <= (product.minStock || 10)) {
        lowStock++;
      } else {
        inStock++;
      }
    }

    return { inStock, lowStock, outOfStock, total: products.length };
  }

  static async getTopProducts(tenantId: string, branchId: string | undefined, limit = 5) {
    const query: any = { tenantId, status: 'completed' };
    if (branchId) query.branch = branchId;

    const topProducts = await Sale.aggregate([
      { $match: query },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
      }},
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          sold: '$totalSold',
          revenue: '$totalRevenue',
          percentage: 1
        }
      }
    ]);

    // Calculate percentages for the progress bars
    const maxSold = topProducts.length > 0 ? topProducts[0].sold : 1;
    const productsWithPercentage = topProducts.map((p: any) => ({
      ...p,
      percentage: Math.round((p.sold / maxSold) * 100)
    }));

    const totalSold = productsWithPercentage.reduce((sum: number, p: any) => sum + p.sold, 0);

    return { products: productsWithPercentage, totalSold };
  }
}
