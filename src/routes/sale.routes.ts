import { Router } from 'express';
import { createPublicShopCheckout, createSale, getMyOrders, getPublicOrders, getSales, sendInvoice } from '../controllers/sale.controller';
import { validate } from '../middleware/validate.middleware';
import { createSaleSchema, createShopCheckoutSchema } from '../validators/sale.validator';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/public/checkout', validate(createShopCheckoutSchema), createPublicShopCheckout);
router.get('/public/orders', getPublicOrders);

router.use(protect);

router.get('/me/orders', getMyOrders);
router.get('/', getSales);
router.post('/', validate(createSaleSchema), createSale);
router.post('/:id/send-invoice', sendInvoice);

export default router;
