import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', authorize('super_admin', 'admin', 'facility_manager'), getUsers);
router.post('/', authorize('super_admin', 'admin', 'facility_manager'), createUser);
router.patch('/:id', authorize('super_admin', 'admin', 'facility_manager'), updateUser);
router.put('/:id', authorize('super_admin', 'admin', 'facility_manager'), updateUser);
router.delete('/:id', authorize('super_admin', 'admin', 'facility_manager'), deleteUser);

export default router;
