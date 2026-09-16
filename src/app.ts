import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { initSentry } from './config/sentry.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import apiRoutes from './routes/index.js';

// Inisialisasi Sentry Error Tracking (PRD Arsitektur)
initSentry();

export const app: Express = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://*.scalar.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://*.scalar.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://fonts.scalar.com', 'https://*.scalar.com', 'data:', 'https://cdn.jsdelivr.net'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'connect-src': ["'self'", 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Favicon handler to serve valid icon and eliminate browser 404
const EMPTY_FAVICON = Buffer.from(
  'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'base64'
);
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/x-icon');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(EMPTY_FAVICON);
});

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    // Check Redis
    const redisStatus = redis.status;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      error: (error as Error).message,
    });
  }
});

// Mount API v1 routes
app.use('/api/v1', apiRateLimiter, apiRoutes);

// Scalar API Reference documentation
const openApiContent = {
  openapi: '3.1.0',
  info: {
    title: 'Zhou Consulting Backend API',
    version: '1.0.0',
    description:
      'RESTful API Backend Zhou Consulting (PRD v2 Revisi & Figma Design) mencakup Modul Auth/User, Portal Klien, Portal Admin/Operasional, CMS Publik, dan Superadmin Log Audit.',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'Server dan koneksi database/redis sehat',
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Login pengguna (Klien, Admin, Superadmin)',
        responses: { '200': { description: 'Token JWT dan profil berhasil dikembalikan' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        summary: 'Registrasi korporasi klien baru',
        responses: { '201': { description: 'Akun berhasil didaftarkan' } },
      },
    },
    '/api/v1/client/dashboard/overview': {
      get: {
        summary: 'Ringkasan overview perikatan dan dokumen klien',
        responses: { '200': { description: 'Statistik konsultasi aktif dan dokumen' } },
      },
    },
    '/api/v1/admin/dashboard/overview': {
      get: {
        summary: 'Statistik operasional penugasan admin',
        responses: { '200': { description: 'Overview operasional' } },
      },
    },
  },
};

app.use(
  '/docs',
  apiReference({
    content: openApiContent,
  } as any)
);
