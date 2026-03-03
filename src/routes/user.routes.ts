import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

router.get('/', authorize('super_admin', 'admin'), getUsers);
router.post('/', authorize('super_admin', 'admin'), createUser);
router.patch('/:id', authorize('super_admin', 'admin'), updateUser);
router.delete('/:id', authorize('super_admin'), deleteUser);

export default router;
