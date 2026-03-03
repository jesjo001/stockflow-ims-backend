import { Router } from 'express';
import { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', authorize('admin', 'super_admin', 'manager'), createSupplier);
router.patch('/:id', authorize('admin', 'super_admin', 'manager'), updateSupplier);
router.delete('/:id', authorize('admin', 'super_admin'), deleteSupplier);

export default router;
