import cron from 'node-cron';
import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { Notification } from '../models/Notification.model';
import { logger } from '../config/logger';

export const initLowStockJob = () => {
  // Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running low stock alert job...');
    try {
      const stocks = await StockLevel.find({}).populate('product');
      
      for (const stock of stocks) {
        const product = stock.product as any;
        if (stock.quantity <= product.reorderPoint) {
          await Notification.create({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `Product ${product.name} is low on stock (${stock.quantity} remaining)`,
            severity: 'warning',
            targetBranch: stock.branch,
            relatedId: product._id,
            relatedModel: 'Product'
          });
        }
      }
    } catch (error) {
      logger.error('Low stock job failed', error);
    }
  });
};
