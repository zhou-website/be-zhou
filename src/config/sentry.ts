import * as Sentry from '@sentry/node';
import 'dotenv/config';

export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn.trim() === '') {
    console.log('ℹ️  Sentry DSN tidak diset. Error monitoring Sentry berjalan dalam mode pasif.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  console.log('🛡️ Sentry Error Monitoring diinisialisasi.');
};

export { Sentry };
