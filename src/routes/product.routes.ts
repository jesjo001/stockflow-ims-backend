import { Router } from 'express';
import { createProduct, getProducts, getProduct, updateProduct, deleteProduct, uploadImages, getSignedUrl, getViewSignedUrl, toggleVisibility } from '../controllers/product.controller';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { upload } from '../middleware/fileUpload.middleware';

const router = Router();

// Public routes for reading VISIBLE products only (no auth required) - placed first
router.get('/public', getProducts);
router.get('/:id', getProduct);

// Protected routes - all mutations require auth
router.use(protect);

// Create product (after protect so we have req.user)
router.post('/', authorize('admin', 'super_admin', 'manager', 'facility_manager'), validate(createProductSchema), createProduct);

router.get('/', getProducts);

// Toggle visibility endpoint
router.patch(
  '/:id/visibility',
  authorize('admin', 'super_admin', 'manager', 'facility_manager'),
  toggleVisibility
);

// Route for getting signed URL for upload (must be before /:id)
router.post(
  '/signed_url',
  authorize('admin', 'super_admin', 'manager', 'facility_manager'),
  getSignedUrl
);

// Route for getting signed URL for viewing (must be before /:id)
router.post(
  '/view_signed_url',
  authorize('admin', 'super_admin', 'manager', 'facility_manager'),
  getViewSignedUrl
);

router.post(
  '/upload-images',
  authorize('admin', 'super_admin', 'manager', 'facility_manager'),
  upload.array('images', 5),
  uploadImages
);

// Parameterized routes LAST
router
  .route('/:id')
  .get(getProduct)
  .patch(authorize('admin', 'super_admin', 'manager', 'facility_manager'), validate(updateProductSchema), updateProduct)
  .delete(authorize('admin', 'super_admin', 'manager',  'facility_manager'), deleteProduct);

export default router;
