import { Router } from 'express';
import { createProduct, getProducts, getProduct, updateProduct, deleteProduct, uploadImages, getSignedUrl, getViewSignedUrl } from '../controllers/product.controller';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { upload } from '../middleware/fileUpload.middleware';

const router = Router();

router.use(protect);

// Specific routes FIRST (before :id route)
router
  .route('/')
  .get(getProducts)
  .post(authorize('admin', 'super_admin', 'manager'), validate(createProductSchema), createProduct);

// Route for getting signed URL for upload (must be before /:id)
router.post(
  '/signed_url',
  authorize('admin', 'super_admin', 'manager'),
  getSignedUrl
);

// Route for getting signed URL for viewing (must be before /:id)
router.post(
  '/view_signed_url',
  authorize('admin', 'super_admin', 'manager'),
  getViewSignedUrl
);

router.post(
  '/upload-images',
  authorize('admin', 'super_admin', 'manager'),
  upload.array('images', 5),
  uploadImages
);

// Parameterized routes LAST
router
  .route('/:id')
  .get(getProduct)
  .patch(authorize('admin', 'super_admin', 'manager'), validate(updateProductSchema), updateProduct)
  .delete(authorize('admin', 'super_admin'), deleteProduct);

export default router;
