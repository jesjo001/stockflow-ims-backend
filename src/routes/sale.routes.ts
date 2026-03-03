import { Router } from 'express';
import { createSale, getSales } from '../controllers/sale.controller';
import { validate } from '../middleware/validate.middleware';
import { createSaleSchema } from '../validators/sale.validator';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getSales);
router.post('/', validate(createSaleSchema), createSale);

export default router;
