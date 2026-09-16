import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import clientRoutes from './client.routes.js';
import adminRoutes from './admin.routes.js';
import cmsRoutes from './cms.routes.js';
import superadminRoutes from './superadmin.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

// Endpoint grouping under /api/v1
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/client', clientRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/cms', cmsRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/public', publicRoutes);

export default router;
