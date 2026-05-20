import { Router } from 'express';
import {
  createFeedback,
  getFeedback,
  getFeedbackById,
  respondToFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackStats,
} from '../controllers/feedback.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Public route: Submit feedback (no authentication required for public feedback)
router.post('/', createFeedback);

// Protected routes: Admin only
router.use(protect); // All routes below require authentication

// Get feedback stats
router.get('/stats/overview', getFeedbackStats);

// Get all feedback with pagination and filters
router.get('/', getFeedback);

// Get single feedback by ID
router.get('/:id', getFeedbackById);

// Respond to feedback with email
router.post('/:id/respond', respondToFeedback);

// Update feedback status
router.patch('/:id/status', updateFeedbackStatus);

// Delete feedback
router.delete('/:id', deleteFeedback);

export default router;
