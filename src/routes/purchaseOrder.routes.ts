import { Router } from 'express';
import { createPurchaseOrder, getPurchaseOrders, receiveGoods } from '../controllers/purchaseOrder.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', getPurchaseOrders);
router.post('/', authorize('admin', 'super_admin', 'manager'), createPurchaseOrder);
router.post('/:id/receive', authorize('admin', 'super_admin', 'stock_clerk'), receiveGoods);

export default router;
