import { initLowStockJob } from './lowStockAlert.job';
import { initSalesSummaryJob } from './salesSummary.job';
import { logger } from '../config/logger';

export const initJobs = () => {
  logger.info('Initializing scheduled jobs...');
  initLowStockJob();
  initSalesSummaryJob();
  logger.info('All scheduled jobs initialized successfully.');
};
