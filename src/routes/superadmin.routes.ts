import { Router } from 'express';
import {
  getAdmins,
  createAdmin,
  deactivateAdmin,
  deleteAdmin,
  getAuditLogs,
  exportAuditLogs,
} from '../controllers/superadmin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('SUPERADMIN'));

router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.post('/admins/:id/deactivate', deactivateAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogs);

export default router;
