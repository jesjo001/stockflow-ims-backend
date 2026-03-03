import { Router } from 'express';
import { createProduct, getProducts, getProduct, updateProduct, deleteProduct, uploadImages } from '../controllers/product.controller';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { upload } from '../middleware/fileUpload.middleware';

const router = Router();

router.use(protect);

router
  .route('/')
  .get(getProducts)
  .post(authorize('admin', 'super_admin', 'manager'), validate(createProductSchema), createProduct);

router
  .route('/:id')
  .get(getProduct)
  .patch(authorize('admin', 'super_admin', 'manager'), validate(updateProductSchema), updateProduct)
  .delete(authorize('admin', 'super_admin'), deleteProduct);

router.post(
  '/upload-images',
  authorize('admin', 'super_admin', 'manager'),
  upload.array('images', 5), // 'images' is the field name, 5 is the max count
  uploadImages
);

export default router;
