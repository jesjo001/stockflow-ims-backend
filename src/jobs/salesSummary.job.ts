import cron from 'node-cron';
import { Settings } from '../models/Settings.model';
import { User } from '../models/User.model';
import { Tenant } from '../models/Tenant.model';
import { Notification } from '../models/Notification.model';
import { ReportService } from '../services/report.service';
import { emailService } from '../utils/email';
import { logger } from '../config/logger';
import { subDays, startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export const initSalesSummaryJob = () => {
  // Daily Sales Summary - Every day at 12:00 AM
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily sales summary job...');
    const yesterday = subDays(new Date(), 1);
    const startDate = startOfDay(yesterday);
    const endDate = endOfDay(yesterday);
    const periodStr = format(yesterday, 'MMMM dd, yyyy');

    await processSalesSummary(startDate, endDate, periodStr, 'daily');
  });

  // Monthly Sales Summary - 1st of every month at 12:01 AM
  cron.schedule('1 0 1 * *', async () => {
    logger.info('Running monthly sales summary job...');
    const lastMonth = subMonths(new Date(), 1);
    const startDate = startOfMonth(lastMonth);
    const endDate = endOfMonth(lastMonth);
    const periodStr = format(lastMonth, 'MMMM yyyy');

    await processSalesSummary(startDate, endDate, periodStr, 'monthly');
  });
};

async function processSalesSummary(startDate: Date, endDate: Date, periodStr: string, type: 'daily' | 'monthly') {
  try {
    // Find all settings where notifyDailySummary is enabled
    // Note: We use the same setting for both daily and monthly for now as requested
    const allSettings = await Settings.find({ notifyDailySummary: true }).populate('tenantId');

    for (const settings of allSettings) {
      try {
        const tenant = settings.tenantId as any;
        if (!tenant) continue;

        const summary = await ReportService.getPnLSummary(tenant._id, undefined, startDate.getFullYear());
        // Since getPnLSummary takes year but we want specific range, let's use getSalesSummary or a modified call
        // Actually, getPnLSummary in report.service.ts uses the whole year. We need a range-based one.
        
        // Let's calculate for the specific range
        const rangeSummary = await calculateRangeSummary(tenant._id, startDate, endDate);

        if (rangeSummary.salesCount === 0 && type === 'daily') {
          // Optional: Skip if no sales? User might still want to know. 
          // For now, let's send even if zero.
        }

        // Find all admins for this tenant
        const admins = await User.find({
          tenantId: tenant._id,
          role: { $in: ['admin', 'super_admin', 'facility_manager'] },
          isActive: true
        });

        for (const admin of admins) {
          // Send In-App Notification
          await Notification.create({
            tenantId: tenant._id,
            type: 'sales_summary',
            title: `${type === 'daily' ? 'Daily' : 'Monthly'} Sales Summary`,
            message: `Summary for ${periodStr}: Revenue ${settings.currency} ${rangeSummary.revenue.toLocaleString()}, Profit ${settings.currency} ${rangeSummary.profit.toLocaleString()}, Income ${settings.currency} ${rangeSummary.income.toLocaleString()}, Sales: ${rangeSummary.salesCount}`,
            severity: 'info',
            targetUser: admin._id
          });

          // Send Email
          await emailService.sendSalesSummaryEmail(
            admin.email,
            admin.firstName,
            tenant.name || settings.companyName || 'Your Business',
            {
              period: periodStr,
              revenue: rangeSummary.revenue,
              profit: rangeSummary.profit,
              income: rangeSummary.income,
              salesCount: rangeSummary.salesCount,
              currency: settings.currency || 'USD'
            }
          );
        }
      } catch (error) {
        logger.error(`Failed to process summary for tenant ${settings.tenantId}:`, error);
      }
    }
  } catch (error) {
    logger.error(`${type} sales summary job failed:`, error);
  }
}

async function calculateRangeSummary(tenantId: any, startDate: Date, endDate: Date) {
  const { Sale } = await import('../models/Sale.model');
  
  const match = {
    tenantId,
    status: 'completed',
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const stats = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalTax: { $sum: '$taxAmount' },
        salesCount: { $sum: 1 }
      }
    }
  ]);

  const cogsResult = await Sale.aggregate([
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

  const revenue = stats[0]?.totalRevenue || 0;
  const tax = stats[0]?.totalTax || 0;
  const salesCount = stats[0]?.salesCount || 0;
  const totalCOGS = cogsResult[0]?.totalCOGS || 0;

  return {
    revenue,
    tax,
    profit: revenue - totalCOGS,
    income: revenue - tax - totalCOGS,
    salesCount
  };
}
