import { Router } from 'express';
import {
  updateCompanyProfile,
  createService,
  createTaxRate,
  createRegulation,
  createEducation,
  createCareer,
  getJobApplications,
} from '../controllers/cms.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

router.put('/company-profiles', updateCompanyProfile);
router.post('/services', createService);
router.post('/tax-rates', createTaxRate);
router.post('/regulations', createRegulation);
router.post('/education', createEducation);
router.post('/careers', createCareer);
router.get('/job-applications', getJobApplications);

export default router;
