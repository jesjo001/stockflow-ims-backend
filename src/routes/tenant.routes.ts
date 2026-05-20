import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import {
  getAllTenants,
  getTenantById,
  updateTenant,
  updateSubscriptionPlan,
  getTenantStats
} from '../controllers/tenant.controller';

const router = Router();

// All tenant routes require authentication
router.use(protect);

router.get('/', authorize('super_admin', 'facility_manager'), getAllTenants);
router.get('/stats', authorize('super_admin', 'facility_manager'), getTenantStats);
router.get('/:id', authorize('super_admin', 'facility_manager', 'admin'), getTenantById);
router.put('/:id', authorize('super_admin', 'facility_manager'), updateTenant);
router.put('/:id/subscription', authorize('super_admin', 'facility_manager'), updateSubscriptionPlan);

export default router;