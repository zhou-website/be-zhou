import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';

// Rate Limiter khusus endpoint login & otentikasi untuk mencegah serangan brute-force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 10, // Maksimal 10 percobaan per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error RedisStore sendCommand typing
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args),
    prefix: 'rl:auth:',
  }),
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba kembali dalam 15 menit.',
  },
});

// Rate Limiter umum untuk seluruh rute API
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  limit: 100, // 100 request per menit
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error RedisStore sendCommand typing
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args),
    prefix: 'rl:general:',
  }),
  message: {
    success: false,
    message: 'Batas kuota request tercapai. Silakan coba sesaat lagi.',
  },
});
