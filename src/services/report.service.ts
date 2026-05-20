import { Sale } from '../models/Sale.model';
import { StockLevel } from '../models/StockLevel.model';
import mongoose from 'mongoose';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export class ReportService {
  // Mongoose aggregate $match does NOT auto-convert strings to ObjectIds —
  // always use new mongoose.Types.ObjectId() in pipelines.
  private static toOID(id: string) {
    return new mongoose.Types.ObjectId(id);
  }

  static async getSalesSummary(startDate: Date, endDate: Date, tenantId: string, branchId?: string) {
    const match: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
      tenantId: this.toOID(tenantId),
    };
    if (branchId) match.branch = this.toOID(branchId);

    const summary = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalTax: { $sum: '$taxAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return summary[0] || { totalSales: 0, totalTax: 0, totalDiscount: 0, count: 0 };
  }

  static async getMonthlySales(tenantId: string, branchId?: string, year?: number) {
    const y = year || new Date().getFullYear();
    const match: any = {
      status: 'completed',
      tenantId: this.toOID(tenantId),
      createdAt: {
        $gte: new Date(`${y}-01-01T00:00:00.000Z`),
        $lte: new Date(`${y}-12-31T23:59:59.999Z`),
      },
    };
    if (branchId) match.branch = this.toOID(branchId);

    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          revenue: { $sum: '$total' },
          cost: { $sum: '$subtotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return MONTHS.map((month, i) => {
      const row = rows.find(r => r._id.month === i + 1);
      const revenue = row?.revenue || 0;
      const cost = row ? Math.round(revenue * 0.6) : 0;
      return { month, revenue, cost, profit: revenue - cost, count: row?.count || 0 };
    });
  }

  static async getWeeklySales(tenantId: string, branchId?: string, weeks = 12) {
    const today = new Date();
    const startDate = subWeeks(startOfWeek(today), weeks - 1);
    const endDate = endOfWeek(today);

    const match: any = {
      status: 'completed',
      tenantId: this.toOID(tenantId),
      createdAt: { $gte: startDate, $lte: endDate },
    };
    if (branchId) match.branch = this.toOID(branchId);

    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          cost: { $sum: '$subtotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const result = [];
    let currentDate = startOfWeek(today);
    for (let i = 0; i < weeks; i++) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const year = weekStart.getFullYear();
      const weekNum = Math.ceil((weekStart.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      const row = rows.find(r => r._id.year === year && r._id.week === weekNum);
      const revenue = row?.revenue || 0;
      const cost = row ? Math.round(revenue * 0.6) : 0;
      
      result.push({
        label: `W${i + 1}`,
        revenue,
        cost,
        profit: revenue - cost,
        count: row?.count || 0,
      });
      
      currentDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return result.reverse();
  }

  static async getDailySales(tenantId: string, branchId?: string, days = 30) {
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    
    const match: any = {
      status: 'completed',
      tenantId: this.toOID(tenantId),
      createdAt: { $gte: startDate, $lte: today },
    };
    if (branchId) match.branch = this.toOID(branchId);

    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          cost: { $sum: '$subtotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = format(date, 'yyyy-MM-dd');
      const row = rows.find(r => r._id === dateStr);
      const revenue = row?.revenue || 0;
      const cost = row ? Math.round(revenue * 0.6) : 0;
      
      result.push({
        label: format(date, 'MMM dd'),
        revenue,
        cost,
        profit: revenue - cost,
        count: row?.count || 0,
      });
    }

    return result;
  }

  static async getPnLSummary(tenantId: string, branchId?: string, year?: number) {
    const y = year || new Date().getFullYear();
    const match: any = {
      status: 'completed',
      tenantId: this.toOID(tenantId),
      createdAt: {
        $gte: new Date(`${y}-01-01T00:00:00.000Z`),
        $lte: new Date(`${y}-12-31T23:59:59.999Z`),
      },
    };
    if (branchId) match.branch = this.toOID(branchId);

    // Get revenue from Sales
    const revResult = await Sale.aggregate([
      { $match: match },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTax: { $sum: '$taxAmount' }, totalDiscount: { $sum: '$discountAmount' }, count: { $sum: 1 } } },
    ]);
    const rev = revResult[0] || { totalRevenue: 0, totalTax: 0, totalDiscount: 0, count: 0 };

    // Get cost of goods sold from sale items × product costPrice
    const cogResult = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: null,
          totalCOGS: { $sum: { $multiply: ['$items.quantity', '$productInfo.costPrice'] } },
        },
      },
    ]);
    const cogs = cogResult[0]?.totalCOGS || 0;

    return {
      totalRevenue: rev.totalRevenue,
      totalTax: rev.totalTax,
      totalDiscount: rev.totalDiscount,
      totalCOGS: cogs,
      grossProfit: rev.totalRevenue - cogs,
      totalTransactions: rev.count,
    };
  }

  static async getInventoryValuation(tenantId: string, branchId?: string) {
    const query: Record<string, unknown> = { tenantId: this.toOID(tenantId) };
    if (branchId) query.branch = this.toOID(branchId);
    
    const stocks = await StockLevel.find(query).populate('product');
    let totalValuation = 0;
    
    for (const stock of stocks) {
      const product = stock.product as any;
      if (product && product.sellingPrice) {
        totalValuation += stock.quantity * product.sellingPrice;
      }
    }

    return { totalValuation, date: new Date() };
  }

  static async getStockSummary(tenantId: string, branchId?: string) {
    const match: any = { tenantId: this.toOID(tenantId) };
    if (branchId) match.branch = this.toOID(branchId);

    const result = await StockLevel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: null,
          inStock: { $sum: { $cond: [{ $gt: ['$quantity', { $ifNull: ['$productInfo.reorderPoint', 10] }] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', { $ifNull: ['$productInfo.reorderPoint', 10] }] }] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { inStock: 0, lowStock: 0, outOfStock: 0, total: 0 };
  }

  static async getStockByCategory(tenantId: string, branchId?: string) {
    const match: any = { tenantId: this.toOID(tenantId) };
    if (branchId) match.branch = this.toOID(branchId);

    const result = await StockLevel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ['$categoryInfo.name', 0] }, 'Uncategorized'] },
          inStock: { $sum: { $cond: [{ $gt: ['$quantity', { $ifNull: ['$productInfo.reorderPoint', 10] }] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', { $ifNull: ['$productInfo.reorderPoint', 10] }] }] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
        },
      },
      { $project: { category: '$_id', inStock: 1, lowStock: 1, outOfStock: 1, _id: 0 } },
      { $sort: { category: 1 } },
    ]);

    return result;
  }

  static async getTopProducts(tenantId: string, branchId: string | undefined, limit = 5) {
    const match: any = { tenantId: this.toOID(tenantId), status: 'completed' };
    if (branchId) match.branch = this.toOID(branchId);

    const topProducts = await Sale.aggregate([
      { $match: match },
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
