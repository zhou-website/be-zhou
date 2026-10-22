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
  downloadRegulationFile,
  createEducation,
  updateEducation,
  deleteEducation,
  downloadEducationFile,
  createCareer,
  updateCareer,
  deleteCareer,
  getCareerSettings,
  updateCareerSettings,
  getJobApplications,
  downloadJobApplicationCv,
  deleteJobApplication,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  updateContactSettings,
  updateJobApplicationStatus,
  updateServiceDetails,
  toggleServiceStatus,
  toggleRegulationStatus,
  toggleEducationStatus,
  batchUpdateTaxRates,
  getLearningLinks,
  createLearningLink,
  updateLearningLink,
  deleteLearningLink,
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
router.put('/services/:id/details', updateServiceDetails);
router.patch('/services/:id/status', toggleServiceStatus);
router.delete('/services/:id', deleteService);

// Tax Rates
router.post('/tax-rates', createTaxRate);
router.post('/tax-rates/batch', batchUpdateTaxRates);
router.put('/tax-rates/:id', updateTaxRate);
router.delete('/tax-rates/:id', deleteTaxRate);

// Regulations
router.post('/regulations', flexibleUploadMiddleware, createRegulation);
router.put('/regulations/:id', flexibleUploadMiddleware, updateRegulation);
router.get('/regulations/:id/download', downloadRegulationFile);
router.patch('/regulations/:id/status', toggleRegulationStatus);
router.delete('/regulations/:id', deleteRegulation);

// Education
router.post('/education', flexibleUploadMiddleware, createEducation);
router.put('/education/:id', flexibleUploadMiddleware, updateEducation);
router.get('/education/:id/download', downloadEducationFile);
router.patch('/education/:id/status', toggleEducationStatus);
router.delete('/education/:id', deleteEducation);


// Learning Links (Modul Belajar Pajak)
router.get('/learning-links', getLearningLinks);
router.post('/learning-links', createLearningLink);
router.put('/learning-links/:id', updateLearningLink);
router.delete('/learning-links/:id', deleteLearningLink);

// Careers & Applications
router.post('/careers', createCareer);
router.put('/careers/:id', updateCareer);
router.delete('/careers/:id', deleteCareer);
router.get('/career-settings', getCareerSettings);
router.put('/career-settings', updateCareerSettings);
router.get('/job-applications', getJobApplications);
router.patch('/job-applications/:id/status', updateJobApplicationStatus);
router.get('/job-applications/:id/download', downloadJobApplicationCv);
router.delete('/job-applications/:id', deleteJobApplication);

// Chatbot FAQs CRUD
router.get('/faqs', getFaqs);
router.post('/faqs', createFaq);
router.put('/faqs/:id', updateFaq);
router.delete('/faqs/:id', deleteFaq);

// Site Settings & Contact
router.put('/settings/contact', updateContactSettings);

export default router;
