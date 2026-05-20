import { Router } from 'express';
import { getSalesSummary, getValuation, getStockSummary, getTopProducts, getMonthlySales, getWeeklySales, getDailySales, getPnLSummary, getStockByCategory } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/sales-summary', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getSalesSummary);
router.get('/valuation', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getValuation);
router.get('/stock-summary', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getStockSummary);
router.get('/top-products', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getTopProducts);
router.get('/monthly-sales', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getMonthlySales);
router.get('/weekly-sales', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getWeeklySales);
router.get('/daily-sales', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getDailySales);
router.get('/pnl', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getPnLSummary);
router.get('/stock-by-category', authorize('manager', 'admin', 'super_admin', 'facility_manager'), getStockByCategory);

export default router;
