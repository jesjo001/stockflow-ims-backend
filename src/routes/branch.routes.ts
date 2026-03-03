import { Router } from 'express';
import { createBranch, getBranches, updateBranch } from '../controllers/branch.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);
router.get('/', getBranches);
router.post('/', authorize('super_admin', 'admin'), createBranch);

router.patch('/:id', authorize('super_admin', 'admin'), updateBranch);

export default router;
