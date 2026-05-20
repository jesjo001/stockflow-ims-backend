import { Router } from 'express';
import { createCategory, getCategories } from '../controllers/category.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Public routes
router.get('/', getCategories);

// Protected routes
router.use(protect);
router.post('/', authorize('manager', 'admin', 'super_admin', 'facility_manager'), createCategory);

export default router;
