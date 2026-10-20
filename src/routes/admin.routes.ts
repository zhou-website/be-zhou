import { Router } from 'express';
import {
  getDashboardOverview,
  getConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  updateConsultationStatus,
  assignConsultationPic,
  addProjectTask,
  toggleProjectTask,
  uploadDocument,
  getGlobalDocuments,
  deleteDocument,
  deleteConsultation,
  archiveConsultation,
  updateConsultationPriority,
  getClients,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { consultationDocUploadMiddleware } from '../middlewares/upload.middleware.js';
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
router.get('/consultations/:id', getConsultationById);
router.post('/consultations', validate(createConsultationSchema), createConsultation);
router.put('/consultations/:id', updateConsultation);
router.delete('/consultations/:id', deleteConsultation);
router.patch('/consultations/:id/archive', archiveConsultation);
router.patch('/consultations/:id/priority', updateConsultationPriority);
router.patch('/consultations/:id/status', validate(updateStatusSchema), updateConsultationStatus);
router.patch('/consultations/:id/assign', assignConsultationPic);
router.post('/consultations/:id/tasks', validate(addTaskSchema), addProjectTask);
router.patch('/consultations/:id/tasks/:taskId', validate(toggleTaskSchema), toggleProjectTask);
router.post('/consultations/:id/documents', consultationDocUploadMiddleware, uploadDocument);
router.get('/documents', getGlobalDocuments);
router.delete('/documents/:id', deleteDocument);

export default router;
