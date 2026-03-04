import { Router } from 'express';
import { getSalesSummary, getValuation, getStockSummary, getTopProducts, getMonthlySales, getPnLSummary, getStockByCategory } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/sales-summary', authorize('manager', 'admin', 'super_admin'), getSalesSummary);
router.get('/valuation', authorize('manager', 'admin', 'super_admin'), getValuation);
router.get('/stock-summary', authorize('manager', 'admin', 'super_admin'), getStockSummary);
router.get('/top-products', authorize('manager', 'admin', 'super_admin'), getTopProducts);
router.get('/monthly-sales', authorize('manager', 'admin', 'super_admin'), getMonthlySales);
router.get('/pnl', authorize('manager', 'admin', 'super_admin'), getPnLSummary);
router.get('/stock-by-category', authorize('manager', 'admin', 'super_admin'), getStockByCategory);

export default router;
