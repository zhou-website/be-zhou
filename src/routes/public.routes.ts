import { Router } from 'express';
import {
  getCompanyProfiles,
  getServices,
  getTaxRates,
  getRegulations,
  getEducation,
  getCareers,
  applyCareer,
  getContactSettings,
  submitContactMessage,
} from '../controllers/cms.controller.js';

import { validate } from '../middlewares/validator.middleware.js';
import { contactFormSchema } from '../schemas/public.schema.js';

const router = Router();

router.get('/company-profiles', getCompanyProfiles);
router.get('/services', getServices);
router.get('/tax-rates/latest', getTaxRates);
router.get('/regulations', getRegulations);
router.get('/education', getEducation);
router.get('/careers', getCareers);
router.post('/careers/:id/apply', applyCareer);
router.get('/settings/contact', getContactSettings);
router.post('/contact', validate(contactFormSchema), submitContactMessage);

export default router;
