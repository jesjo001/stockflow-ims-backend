import { Router } from 'express';
import { adjustStock, getStockLevels } from '../controllers/stock.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', getStockLevels);
router.post('/adjust', authorize('stock_clerk', 'admin', 'super_admin', 'manager'), adjustStock);

export default router;
