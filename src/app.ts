import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { initSentry } from './config/sentry.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import apiRoutes from './routes/index.js';
import { getApiGuide } from './controllers/guide.controller.js';

// Inisialisasi Sentry Error Tracking (PRD Arsitektur)
initSentry();

export const app: Express = express();

// Security and utility middleware
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://*.scalar.com', 'blob:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://*.scalar.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://fonts.scalar.com', 'https://*.scalar.com', 'data:', 'https://cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'connect-src': ["'self'", 'https:', 'http:', '*'],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'", 'blob:'],
      // PENTING: Matikan upgrade-insecure-requests agar browser tidak memaksa HTTPS saat pengujian via HTTP/IP VPS
      'upgrade-insecure-requests': null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
});

// Terapkan Helmet untuk seluruh request kecuali rute /docs (Scalar Documentation)
// agar komponen interaktif, blob web worker, dan pengujian request Scalar berjalan mulus tanpa restriksi browser
app.use((req, res, next) => {
  if (req.path.startsWith('/docs')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return next();
  }
  return helmetMiddleware(req, res, next);
});

// Comprehensive CORS configuration for frontend testing, PM evaluation, and production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Mengizinkan request tanpa origin (seperti Postman, cURL, automated tests, mobile apps)
      if (!origin) return callback(null, true);

      // Selama fase pengujian & deployment, izinkan seluruh origin dan pantulkan kembali
      // agar credentials: true berfungsi sempurna tanpa kendala origin mismatch
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'sentry-trace',
      'baggage',
      'Cache-Control',
      'Pragma',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Panduan Pengetesan API & Landing Page untuk Tester / PM / Developer
app.get('/', getApiGuide);
app.get('/api', getApiGuide);

// Favicon handler to serve valid icon and eliminate browser 404
const FAVICON_BASE64 =
  'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const EMPTY_FAVICON = Buffer.from(
  'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'base64'
);

const serveFavicon = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/x-icon');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(EMPTY_FAVICON);
};

app.get('/favicon.ico', serveFavicon);
app.get('/docs/favicon.ico', serveFavicon);

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

// Scalar API Reference documentation – loads full OpenAPI spec from docs/openapi.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const primaryOpenApiPath = path.resolve(process.cwd(), 'docs', 'openapi.json');
const fallbackOpenApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
const openApiPath = fs.existsSync(primaryOpenApiPath) ? primaryOpenApiPath : fallbackOpenApiPath;

let openApiContent: Record<string, unknown>;
try {
  openApiContent = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));
} catch {
  console.warn('⚠️  docs/openapi.json not found – Scalar will show minimal spec');
  openApiContent = {
    openapi: '3.1.0',
    info: { title: 'Zhou Consulting Backend API', version: '1.0.0' },
    paths: {},
  };
}

app.use(
  '/docs',
  apiReference({
    content: openApiContent,
    servers: (openApiContent as any)?.servers,
    favicon: FAVICON_BASE64,
  } as any)
);

// 404 Catch-all handler for undefined API routes (JSON format)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Rute API tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server',
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});


