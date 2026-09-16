import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Proteksi brute-force login & register menggunakan Redis rate limiter
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/google', authRateLimiter, googleLogin);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.post('/logout', requireAuth, logout);

export default router;
