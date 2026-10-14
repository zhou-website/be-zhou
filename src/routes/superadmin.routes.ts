import { Router } from 'express';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deactivateAdmin,
  reactivateAdmin,
  deleteAdmin,
  getAuditLogs,
  exportAuditLogs,
} from '../controllers/superadmin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('SUPERADMIN'));

router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.post('/admins/:id/deactivate', deactivateAdmin);
router.post('/admins/:id/reactivate', reactivateAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogs);

export default router;
