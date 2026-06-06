import { Router } from 'express';
import {
	registerOwner,
	register,
	login,
	refreshToken,
	logout,
	resetPassword,
	forgotPassword,
	verifyEmail,
	resendVerificationEmail,
  registerAffiliate,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, affiliateRegisterSchema } from '../validators/auth.validator';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public initial super admin registration
router.post('/register-owner', authLimiter, validate(registerSchema), registerOwner);

// Affiliate registration
router.post('/register-affiliate', authLimiter, validate(affiliateRegisterSchema), registerAffiliate);

// User registration by privileged tenant admins
router.post('/register', authLimiter, protect, authorize('super_admin', 'admin', 'facility_manager'), register);

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

// Password reset endpoints
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);

// Email verification endpoints
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-email', authLimiter, resendVerificationEmail);

export default router;
