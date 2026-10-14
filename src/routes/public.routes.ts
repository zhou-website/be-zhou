import { Router } from 'express';
import {
  getCompanyProfiles,
  getServices,
  getTaxRates,
  getRegulations,
  getRegulationById,
  downloadRegulationFile,
  getEducation,
  getEducationById,
  downloadEducationFile,
  getCareers,
  getCareerById,
  applyCareer,
  getContactSettings,
  submitContactMessage,
  uploadPublicFile,
} from '../controllers/cms.controller.js';

import { validate } from '../middlewares/validator.middleware.js';
import { contactFormSchema } from '../schemas/public.schema.js';
import { flexibleUploadMiddleware } from '../middlewares/upload.middleware.js';
import { getChatbotTree } from '../controllers/client.controller.js';

const router = Router();

router.get('/company-profiles', getCompanyProfiles);
router.get('/services', getServices);
router.get('/tax-rates/latest', getTaxRates);

// Regulations & Download
router.get('/regulations', getRegulations);
router.get('/regulations/:id', getRegulationById);
router.get('/regulations/:id/download', downloadRegulationFile);

// Education & Download
router.get('/education', getEducation);
router.get('/education/:id', getEducationById);
router.get('/education/:id/download', downloadEducationFile);

// Careers & Application
router.get('/careers', getCareers);
router.get('/careers/:id', getCareerById);
router.post('/careers/:id/apply', flexibleUploadMiddleware, applyCareer);

// Public File Upload Helper (misal upload CV, berkas edukasi, atau formulir publik ke Supabase Storage)
router.post('/upload', flexibleUploadMiddleware, uploadPublicFile);

// Contact & Settings
router.get('/settings/contact', getContactSettings);
router.post('/contact', validate(contactFormSchema), submitContactMessage);

// Chatbot Decision Tree untuk pengunjung baru / landing page / kontak (Item #5 Revisi FE)
router.get('/chatbot/tree', getChatbotTree);
router.get('/chatbot', getChatbotTree);

export default router;

