import { Router } from 'express';
import {
  updateCompanyProfile,
  createService,
  updateService,
  deleteService,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  createEducation,
  updateEducation,
  deleteEducation,
  createCareer,
  updateCareer,
  deleteCareer,
  getJobApplications,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  updateContactSettings,
} from '../controllers/cms.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

// Company Profiles
router.put('/company-profiles', updateCompanyProfile);

// Services
router.post('/services', createService);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);

// Tax Rates
router.post('/tax-rates', createTaxRate);
router.put('/tax-rates/:id', updateTaxRate);
router.delete('/tax-rates/:id', deleteTaxRate);

// Regulations
router.post('/regulations', createRegulation);
router.put('/regulations/:id', updateRegulation);
router.delete('/regulations/:id', deleteRegulation);

// Education
router.post('/education', createEducation);
router.put('/education/:id', updateEducation);
router.delete('/education/:id', deleteEducation);

// Careers & Applications
router.post('/careers', createCareer);
router.put('/careers/:id', updateCareer);
router.delete('/careers/:id', deleteCareer);
router.get('/job-applications', getJobApplications);

// Chatbot FAQs CRUD
router.get('/faqs', getFaqs);
router.post('/faqs', createFaq);
router.put('/faqs/:id', updateFaq);
router.delete('/faqs/:id', deleteFaq);

// Site Settings & Contact
router.put('/settings/contact', updateContactSettings);

export default router;
