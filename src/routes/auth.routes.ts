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
import { validate } from '../middlewares/validator.middleware.js';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

// Proteksi brute-force login & register menggunakan Redis rate limiter + Zod input validation
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/google', authRateLimiter, validate(googleLoginSchema), googleLogin);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/logout', requireAuth, logout);

export default router;
