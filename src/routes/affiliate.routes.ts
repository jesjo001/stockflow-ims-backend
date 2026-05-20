import { Router } from 'express';
import { AffiliateController } from '../controllers/affiliate.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(protect);

// Super admin only - manage affiliates
router.get('/settings/default-percentage', authorize('super_admin'), AffiliateController.getDefaultPercentage);
router.patch('/settings/default-percentage', authorize('super_admin'), AffiliateController.setDefaultPercentage);

router.get('/', authorize('super_admin'), AffiliateController.getAll);
router.post('/', authorize('super_admin'), AffiliateController.create);
router.post('/assign-to-user', authorize('super_admin'), AffiliateController.assignAffiliateToUser);
router.patch('/:id/commission', authorize('super_admin'), AffiliateController.updateCommission);
router.post('/:id/deactivate', authorize('super_admin'), AffiliateController.deactivate);

// Self-service endpoints (requires user to have affiliateId)
router.get('/me/dashboard', AffiliateController.getMyDashboard);
router.get('/me/referrals', AffiliateController.getMyReferrals);
router.get('/me/commissions', AffiliateController.getMyCommissionHistory);

// Specific affiliate endpoints (super admin can view any, affiliate can view own)
router.get('/:id/dashboard', AffiliateController.getDashboard);
router.get('/:id/referrals', AffiliateController.getReferrals);
router.get('/:id/commissions', AffiliateController.getCommissionHistory);

export default router;
