import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';

// Rate Limiter khusus endpoint login & otentikasi untuk mencegah serangan brute-force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: process.env.NODE_ENV === 'production' ? 100 : 1000, // Ditingkatkan ke 100 agar QA testing tidak terblokir
  skip: (req) => {
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_RATE_LIMIT === 'true') return true;
    // Di lingkungan lokal development, jangan batasi localhost agar pengetesan lancar
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  },
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
  limit: process.env.NODE_ENV === 'production' ? 500 : 10000, // Ditingkatkan ke 500 agar load/QA testing lancar
  skip: (req) => {
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_RATE_LIMIT === 'true') return true;
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  },
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
