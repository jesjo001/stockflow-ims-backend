import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import stockRoutes from './stock.routes';
import saleRoutes from './sale.routes';
import branchRoutes from './branch.routes';
import categoryRoutes from './category.routes';
import reportRoutes from './report.routes';
import supplierRoutes from './supplier.routes';
import userRoutes from './user.routes';
import purchaseOrderRoutes from './purchaseOrder.routes';
import serviceRoutes from './service.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/sales', saleRoutes);
router.use('/branches', branchRoutes);
router.use('/categories', categoryRoutes);
router.use('/reports', reportRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/users', userRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/services', serviceRoutes);

export default router;
