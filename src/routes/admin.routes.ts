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
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

router.get('/dashboard/overview', getDashboardOverview);
router.get('/consultations', getConsultations);
router.post('/consultations', createConsultation);
router.patch('/consultations/:id/status', updateConsultationStatus);
router.post('/consultations/:id/tasks', addProjectTask);
router.patch('/consultations/:id/tasks/:taskId', toggleProjectTask);
router.post('/consultations/:id/documents', uploadMiddleware.single('file'), uploadDocument);
router.get('/documents', getGlobalDocuments);

export default router;
