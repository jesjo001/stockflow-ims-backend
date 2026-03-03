import { Router } from 'express';
import { getSalesSummary, getValuation } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/sales-summary', authorize('manager', 'admin', 'super_admin'), getSalesSummary);
router.get('/valuation', authorize('manager', 'admin', 'super_admin'), getValuation);

export default router;
