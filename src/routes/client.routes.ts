import { Router } from 'express';
import {
  getDashboardOverview,
  getConsultations,
  getConsultationDetail,
  getDocuments,
  downloadDocument,
  getChatbotTree,
  escalateChatbot,
  createClientConsultation,
  uploadClientDocument,
} from '../controllers/client.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { consultationDocUploadMiddleware, flexibleUploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

// Chatbot tree bisa diakses oleh klien sebelum atau sesudah login
router.get('/chatbot/tree', getChatbotTree);

// Protected routes khusus klien
router.use(requireAuth, requireRole('USER', 'ADMIN', 'SUPERADMIN'));

router.get('/dashboard/overview', getDashboardOverview);
router.get('/consultations', getConsultations);
router.post('/consultations', flexibleUploadMiddleware, createClientConsultation);
router.get('/consultations/:id', getConsultationDetail);
router.post('/consultations/:id/documents', consultationDocUploadMiddleware, uploadClientDocument);

router.get('/documents', getDocuments);
router.get('/documents/:id/download', downloadDocument);
router.post('/chatbot/escalate', escalateChatbot);

export default router;
