import { Router } from 'express';
import { createPurchaseOrder, getPurchaseOrders, receiveGoods } from '../controllers/purchaseOrder.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', authorize('admin', 'super_admin', 'manager', 'cashier', 'stock_clerk', 'viewer', 'facility_manager'), getPurchaseOrders);
router.post('/', authorize('admin', 'super_admin', 'manager', 'cashier', 'stock_clerk', 'facility_manager'), createPurchaseOrder);
router.post('/:id/receive', authorize('admin', 'super_admin', 'stock_clerk'), receiveGoods);

export default router;
