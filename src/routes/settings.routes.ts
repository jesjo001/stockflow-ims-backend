import { Router } from 'express';
import { getSettings, updateSettings, changePassword } from '../controllers/settings.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', getSettings);
router.patch('/', authorize('super_admin', 'admin', 'facility_manager'), updateSettings);
router.post('/change-password', changePassword);

export default router;
