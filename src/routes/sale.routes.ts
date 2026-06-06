import { Router } from 'express';
import { createSale, getSales, sendInvoice } from '../controllers/sale.controller';
import { validate } from '../middleware/validate.middleware';
import { createSaleSchema } from '../validators/sale.validator';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getSales);
router.post('/', validate(createSaleSchema), createSale);
router.post('/:id/send-invoice', sendInvoice);

export default router;
