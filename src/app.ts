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
const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');

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
    favicon: FAVICON_BASE64,
  } as any)
);

