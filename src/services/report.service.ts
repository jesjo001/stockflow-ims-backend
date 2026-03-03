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

  static async getInventoryValuation(branchId: string, tenantId: string) {
    const stocks = await StockLevel.find({ branch: branchId, tenantId }).populate('product');
    let totalValuation = 0;
    
    for (const stock of stocks) {
      const product = stock.product as any;
      totalValuation += (stock.quantity * product.costPrice);
    }

    return { totalValuation, date: new Date() };
  }
}
