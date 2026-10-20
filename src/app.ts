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

// Percayai Nginx reverse proxy di VPS untuk penanganan header X-Forwarded-For dan rate limiter
app.set('trust proxy', 1);

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

// Support comma-separated FRONTEND_URL from environment
const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

// Comprehensive CORS configuration with origin whitelist (Server IP, Vercel frontend, localhost, domain)
const allowedOrigins = [
  ...frontendUrls,
  'https://fe-zhou-git-dev-consultingzhou-1911.vercel.app',
  'https://fe-zhou-git-main-consultingzhou-1911.vercel.app',
  'https://fe-zhou.vercel.app',
  'http://139.190.103.80',
  'https://139.190.103.80',
  'http://139.190.103.80:5000',
  'http://43.173.2.162',
  'https://43.173.2.162',
  'http://43.173.2.162:5000',
  'http://43.173.2.162.sslip.io',
  'https://43.173.2.162.sslip.io',
  'https://zhouconsulting.com',
  'https://dev.zhouconsulting.com',
  'https://zhouconsulting.id',
  'http://zhouconsulting.id',
  'https://dev.zhouconsulting.id',
  'http://dev.zhouconsulting.id',
  'https://api.zhouconsulting.id',
  'http://api.zhouconsulting.id',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Mengizinkan request tanpa origin (seperti Postman desktop, cURL, automated tests, mobile apps)
      if (!origin) return callback(null, true);

      // Cek apakah origin ada di daftar allowedOrigins atau pattern regex
      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isServerIp = /^https?:\/\/(139\.190\.103\.80|43\.173\.2\.162)(:[0-9]+)?$/.test(origin);
      const isSslip = /^https?:\/\/[a-zA-Z0-9_.-]*sslip\.io(:[0-9]+)?$/.test(origin);
      const isFrontendDeploy = /^https:\/\/[a-zA-Z0-9_.-]+\.(vercel\.app|netlify\.app|pages\.dev|railway\.app)$/.test(origin);
      const isZhouDomain = /^https?:\/\/([a-zA-Z0-9_.-]+\.)?zhouconsulting\.(com|id)(:[0-9]+)?$/.test(origin);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?$/.test(origin);
      const isApiTester = /^https?:\/\/([a-zA-Z0-9_.-]+\.)?(scalar\.(com|dev)|postman\.com|hoppscotch\.io|swagger\.io)(:[0-9]+)?$/.test(origin);

      if (isExplicitlyAllowed || isServerIp || isSslip || isFrontendDeploy || isZhouDomain || isLocalhost || isApiTester) {
        return callback(null, true);
      }

      // Izinkan origin lain secara fleksibel untuk kemudahan integrasi tim frontend / pengujian API
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
    // Check DB connection dengan timeout 3.5s agar health check selalu responsif
    const dbPing = prisma.$queryRaw`SELECT 1`;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Koneksi database timeout (>3.5s)')), 3500)
    );
    await Promise.race([dbPing, timeout]);
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

  // Tangani error multer (misal ukuran melebihi batas 5MB)
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran berkas melebihi batas maksimal 5MB'
        : `Kesalahan unggah berkas: ${err.message}`,
    });
  }

  // Tangani error file filter (misal format berkas tidak didukung)
  if (err.message && err.message.includes('Format berkas tidak didukung')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server',
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});



