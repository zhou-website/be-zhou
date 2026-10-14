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
  downloadJobApplicationCv,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  updateContactSettings,
} from '../controllers/cms.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { flexibleUploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

// Sesuai Revisi FE (Item #9 & #10): Akses CRUD CMS dan Lamaran Masuk dibatasi khusus Superadmin
router.use(requireAuth, requireRole('SUPERADMIN'));

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
router.post('/regulations', flexibleUploadMiddleware, createRegulation);
router.put('/regulations/:id', flexibleUploadMiddleware, updateRegulation);
router.delete('/regulations/:id', deleteRegulation);

// Education
router.post('/education', flexibleUploadMiddleware, createEducation);
router.put('/education/:id', flexibleUploadMiddleware, updateEducation);
router.delete('/education/:id', deleteEducation);


// Careers & Applications
router.post('/careers', createCareer);
router.put('/careers/:id', updateCareer);
router.delete('/careers/:id', deleteCareer);
router.get('/job-applications', getJobApplications);
router.get('/job-applications/:id/download', downloadJobApplicationCv);

// Chatbot FAQs CRUD
router.get('/faqs', getFaqs);
router.post('/faqs', createFaq);
router.put('/faqs/:id', updateFaq);
router.delete('/faqs/:id', deleteFaq);

// Site Settings & Contact
router.put('/settings/contact', updateContactSettings);

export default router;
