import { Router } from 'express';
import {
  getDashboardOverview,
  getConsultations,
  createConsultation,
  updateConsultationStatus,
  addProjectTask,
  toggleProjectTask,
  uploadDocument,
  getGlobalDocuments,
  getClients,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validator.middleware.js';
import {
  createConsultationSchema,
  updateStatusSchema,
  addTaskSchema,
  toggleTaskSchema,
} from '../schemas/consultation.schema.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

router.get('/dashboard/overview', getDashboardOverview);
router.get('/clients', getClients);
router.get('/consultations', getConsultations);
router.post('/consultations', validate(createConsultationSchema), createConsultation);
router.patch('/consultations/:id/status', validate(updateStatusSchema), updateConsultationStatus);
router.post('/consultations/:id/tasks', validate(addTaskSchema), addProjectTask);
router.patch('/consultations/:id/tasks/:taskId', validate(toggleTaskSchema), toggleProjectTask);
router.post('/consultations/:id/documents', uploadMiddleware.single('file'), uploadDocument);
router.get('/documents', getGlobalDocuments);

export default router;
