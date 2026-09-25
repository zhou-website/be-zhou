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

// Comprehensive CORS configuration with origin whitelist (Server IP, Vercel frontend, localhost, domain)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://43.173.2.162',
  'https://43.173.2.162',
  'http://43.173.2.162:5000',
  'http://43.173.2.162.sslip.io',
  'https://43.173.2.162.sslip.io',
  'https://zhouconsulting.com',
  'https://api.zhouconsulting.com',
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

      // Cek apakah origin ada di daftar allowedOrigins atau pattern regex (Server IP, sslip.io, vercel.app, zhouconsulting.com)
      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isServerIp = /^https?:\/\/43\.173\.2\.162(:[0-9]+)?$/.test(origin);
      const isSslip = /^https?:\/\/[a-zA-Z0-9_.-]*sslip\.io(:[0-9]+)?$/.test(origin);
      const isVercelDeploy = /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin);
      const isZhouDomain = /^https:\/\/[a-zA-Z0-9_.-]+\.zhouconsulting\.com$/.test(origin);

      if (isExplicitlyAllowed || isServerIp || isSslip || isVercelDeploy || isZhouDomain) {
        return callback(null, true);
      }

      // Di mode development, toleransi origin lokal lainnya
      if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy violation: Origin '${origin}' is not permitted by Zhou Consulting API`), false);
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
  let dbStatus = 'disconnected';
  let dbError: string | null = null;

  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbError = (error as Error).message;
  }

  const redisStatus = redis.status;
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    message: isHealthy
      ? 'Seluruh layanan backend (Database PostgreSQL & Cache Redis) berjalan normal.'
      : `Database PostgreSQL belum aktif atau belum dapat dihubungi. Pastikan Docker aktif dengan: docker compose up -d`,
    error: dbError || undefined,
  });
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


