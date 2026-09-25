import 'dotenv/config';

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('FATAL: JWT_SECRET environment variable is required and cannot be empty.');
}

export const JWT_SECRET = secret;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
