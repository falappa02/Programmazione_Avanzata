import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import datasetRoutes from './dataset.routes';
import inferenceRoutes from './inference.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/datasets', datasetRoutes);
router.use('/inference', inferenceRoutes);

export default router;
