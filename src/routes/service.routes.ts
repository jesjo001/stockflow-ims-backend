import { Router } from 'express';
import { createService, getServices, updateService, deleteService } from '../controllers/service.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getServices);
router.post('/', createService);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
