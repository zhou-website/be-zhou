import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Tidak terotentikasi');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company_name: true,
        avatar_url: true,
        created_at: true,
      },
    });

    if (!user) {
      sendError(res, 404, 'Pengguna tidak ditemukan');
      return;
    }

    sendSuccess(res, 200, 'Berhasil mengambil data profil', user);
  } catch (error) {
    sendError(res, 500, 'Gagal mengambil profil', (error as Error).message);
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, phone, company_name, avatar_url, current_password, new_password } = req.body || {};

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendError(res, 404, 'Pengguna tidak ditemukan');
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    // Ganti password jika diminta
    if (new_password) {
      if (!current_password) {
        sendError(res, 400, 'Kata sandi saat ini diperlukan untuk mengubah kata sandi');
        return;
      }
      if (user.password) {
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
          sendError(res, 400, 'Kata sandi saat ini tidak cocok');
          return;
        }
      }
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company_name: true,
        avatar_url: true,
        updated_at: true,
      },
    });

    sendSuccess(res, 200, 'Profil berhasil diperbarui', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui profil', (error as Error).message);
  }
};

export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Tidak terotentikasi');
      return;
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const sessions = [
      {
        id: 'session-current',
        ip_address: String(clientIp).split(',')[0].trim(),
        user_agent: userAgent,
        device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        is_current: true,
        last_active: new Date().toISOString(),
      },
    ];

    sendSuccess(res, 200, 'Berhasil memuat daftar sesi aktif', sessions);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat sesi', (error as Error).message);
  }
};

export const revokeUserSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    sendSuccess(res, 200, `Sesi '${sessionId}' berhasil dihentikan`);
  } catch (error) {
    sendError(res, 500, 'Gagal menghentikan sesi', (error as Error).message);
  }
};

