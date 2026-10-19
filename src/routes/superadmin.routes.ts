import { Router } from 'express';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deactivateAdmin,
  reactivateAdmin,
  deleteAdmin,
  getAuditLogs,
  exportAuditLogs,
  deleteAuditLogs,
} from '../controllers/superadmin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validator.middleware.js';
import {
  createAdminSchema,
  updateAdminSchema,
  resetAdminPasswordSchema,
} from '../schemas/admin.schema.js';

const router = Router();

router.use(requireAuth, requireRole('SUPERADMIN'));

router.get('/admins', getAdmins);
router.post('/admins', validate(createAdminSchema), createAdmin);
router.put('/admins/:id', validate(updateAdminSchema), updateAdmin);
router.patch('/admins/:id/password', validate(resetAdminPasswordSchema), resetAdminPassword);
router.put('/admins/:id/password', validate(resetAdminPasswordSchema), resetAdminPassword);
router.post('/admins/:id/deactivate', deactivateAdmin);
router.post('/admins/:id/reactivate', reactivateAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogs);
router.delete('/audit-logs', deleteAuditLogs);
router.delete('/audit-logs/:id', deleteAuditLogs);

export default router;
