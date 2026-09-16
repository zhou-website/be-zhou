import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zhou_consulting_jwt_secret_dev_key_2026';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, company_name } = req.body || {};

    if (!name || !email || !password) {
      sendError(res, 400, 'Nama lengkap, email, dan kata sandi wajib diisi');
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      sendError(res, 409, 'Email korporasi telah terdaftar dalam sistem');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        company_name,
        role: 'USER', // Default registrasi publik adalah Klien/User
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company_name: true,
        created_at: true,
      },
    });

    sendSuccess(res, 201, 'Registrasi akun korporasi berhasil', newUser);
  } catch (error) {
    sendError(res, 500, 'Terjadi kesalahan internal server saat registrasi', (error as Error).message);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      sendError(res, 400, 'Email dan kata sandi wajib diisi');
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      sendError(res, 401, 'Kredensial email atau kata sandi tidak valid');
      return;
    }

    if (!user.is_active) {
      sendError(res, 403, 'Akun ini telah dinonaktifkan. Hubungi administrator.');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendError(res, 401, 'Kredensial email atau kata sandi tidak valid');
      return;
    }

    // Hapus status revoked jika sebelumnya ada
    await redis.del(`user_revoked:${user.id}`);

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    sendSuccess(res, 200, 'Login berhasil', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memproses otentikasi login', (error as Error).message);
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body || {};

    if (!email) {
      sendError(res, 400, 'Data Google OAuth tidak lengkap');
      return;
    }

    // Google OAuth hanya untuk role USER/Klien (PRD requirement)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'Google Client User',
          email,
          role: 'USER',
        },
      });
    }

    if (!user.is_active) {
      sendError(res, 403, 'Akun dinonaktifkan');
      return;
    }

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    sendSuccess(res, 200, 'Login Google OAuth berhasil', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
      },
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memproses login Google', (error as Error).message);
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (!email) {
      sendError(res, 400, 'Email wajib disertakan');
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Keamanan: jangan beritahu bahwa email tidak ditemukan
      sendSuccess(res, 200, 'Jika email terdaftar, instruksi reset kata sandi telah dikirimkan.');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 jam

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expires: resetExpires,
      },
    });

    await sendPasswordResetEmail(user.email, resetToken);

    sendSuccess(res, 200, 'Jika email terdaftar, instruksi reset kata sandi telah dikirimkan.');
  } catch (error) {
    sendError(res, 500, 'Gagal memproses lupa kata sandi', (error as Error).message);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, new_password } = req.body || {};
    if (!token || !new_password) {
      sendError(res, 400, 'Token dan kata sandi baru wajib disertakan');
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      sendError(res, 400, 'Token reset kata sandi tidak valid atau telah kadaluarsa');
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      },
    });

    // Revoke sesi aktif sebelumnya
    await redis.set(`user_revoked:${user.id}`, 'true', 'EX', 86400);

    sendSuccess(res, 200, 'Kata sandi berhasil diperbarui. Silakan login kembali.');
  } catch (error) {
    sendError(res, 500, 'Gagal mereset kata sandi', (error as Error).message);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const jti = req.user?.jti;
    if (jti) {
      // Simpan jti ke Redis blacklist selama 24 jam (86400 detik)
      await redis.set(`blacklist:${jti}`, 'revoked', 'EX', 86400);
    }
    sendSuccess(res, 200, 'Logout berhasil, sesi telah dicabut');
  } catch (error) {
    sendError(res, 500, 'Gagal memproses logout', (error as Error).message);
  }
};
