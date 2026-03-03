import { Router } from 'express';
import { registerSuperAdmin, register, login, refreshToken, logout, resetPassword, forgotPassword } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Initial super admin registration (no auth required) - with validation
router.post('/register-super-admin', authLimiter, validate(registerSchema), registerSuperAdmin);

// User registration by admin/super_admin (requires auth)
router.post('/register', authLimiter, protect, authorize('super_admin', 'admin'), register);

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

// Password reset endpoints
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);

export default router;
