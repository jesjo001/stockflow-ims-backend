import { Router } from 'express';
import { createCategory, getCategories } from '../controllers/category.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/', getCategories);
router.post('/', authorize('manager', 'admin', 'super_admin'), createCategory);

export default router;
