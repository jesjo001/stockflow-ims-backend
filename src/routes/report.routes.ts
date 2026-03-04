import { Router } from 'express';
import { getSalesSummary, getValuation, getStockSummary, getTopProducts } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/sales-summary', authorize('manager', 'admin', 'super_admin'), getSalesSummary);
router.get('/valuation', authorize('manager', 'admin', 'super_admin'), getValuation);
router.get('/stock-summary', authorize('manager', 'admin', 'super_admin'), getStockSummary);
router.get('/top-products', authorize('manager', 'admin', 'super_admin'), getTopProducts);

export default router;
