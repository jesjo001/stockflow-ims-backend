import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { paymentValidator } from '../validators/payment.validator';

const router = Router();

// Public webhook endpoint (no authentication required)
router.post('/webhook', PaymentController.handleWebhook);

// Public callback endpoint for Flutterwave redirect
router.get('/callback', PaymentController.handleCallback);

// Protected routes
router.use(protect);

// Initialize payment
router.post(
  '/initialize',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier'),
  validate(paymentValidator.initialize),
  PaymentController.initializePayment
);

// Get all payments
router.get(
  '/',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier', 'viewer'),
  PaymentController.getPayments
);

// Get payment by ID
router.get(
  '/:paymentId',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier', 'viewer'),
  PaymentController.getPaymentById
);

// Get payment link for pending payment
router.get(
  '/:paymentId/link',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier'),
  PaymentController.getPaymentLink
);

// Verify payment by transaction ID
router.get(
  '/verify/:transactionId',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier'),
  PaymentController.verifyPayment
);

// Verify payment by transaction reference
router.get(
  '/verify-ref/:txRef',
  authorize('super_admin', 'admin', 'manager', 'facility_manager', 'cashier'),
  PaymentController.verifyPaymentByRef
);

// Process refund
router.post(
  '/:paymentId/refund',
  authorize('super_admin', 'admin', 'manager', 'facility_manager'),
  validate(paymentValidator.refund),
  PaymentController.processRefund
);

export default router;
