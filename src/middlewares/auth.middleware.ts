import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis.js';
import { sendError } from '../utils/response.js';

import { JWT_SECRET } from '../config/jwt.js';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  jti?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 401, 'Akses ditolak: Token otentikasi tidak ditemukan');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    // Check token blacklist in Redis (JTI revocation & User Deactivation)
    if (decoded.jti) {
      const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        sendError(res, 401, 'Sesi telah berakhir atau hak akses telah dicabut. Silakan login kembali.');
        return;
      }
    }

    // Check jika akun telah dinonaktifkan secara instan oleh Superadmin
    const isUserRevoked = await redis.get(`user_revoked:${decoded.id}`);
    if (isUserRevoked) {
      sendError(res, 403, 'Akses akun Anda telah dinonaktifkan. Silakan hubungi administrator.');
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 401, 'Token tidak valid atau telah kadaluarsa', (error as Error).message);
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Otorisasi gagal: Pengguna belum terotentikasi');
      return;
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!upperAllowed.includes(userRole)) {
      sendError(res, 403, 'Akses dilarang: Peran Anda tidak memiliki hak akses untuk endpoint ini');
      return;
    }

    next();
  };
};
