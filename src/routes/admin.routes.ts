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
  createAdminMessage,
  updateConsultationMilestones,
  updateProjectTasksBatch,
} from '../controllers/admin.controller.js';
import { getConsultationMessages, downloadDocument } from '../controllers/client.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { consultationDocUploadMiddleware } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validator.middleware.js';
import {
  createConsultationSchema,
  updateStatusSchema,
  addTaskSchema,
  toggleTaskSchema,
  updateTasksBatchSchema,
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
router.put('/consultations/:id/tasks', validate(updateTasksBatchSchema), updateProjectTasksBatch);
router.patch('/consultations/:id/tasks/:taskId', validate(toggleTaskSchema), toggleProjectTask);
router.post('/consultations/:id/documents', consultationDocUploadMiddleware, uploadDocument);
router.get('/consultations/:id/documents/:docId/download', downloadDocument);

// Tiket Chat & Catatan Konsultan & Milestones
router.post('/consultations/:id/messages', createAdminMessage);
router.get('/consultations/:id/messages', getConsultationMessages);
router.put('/consultations/:id/milestones', updateConsultationMilestones);

router.get('/documents', getGlobalDocuments);
router.get('/documents/:id/download', downloadDocument);
router.delete('/documents/:id', deleteDocument);


export default router;
