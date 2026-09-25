import { Router } from 'express';
import { getProfile, updateProfile, getUserSessions, revokeUserSession } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/sessions', getUserSessions);
router.delete('/sessions/:id', revokeUserSession);

export default router;
