import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendAdminCredentialsEmail } from '../services/email.service.js';

export const getAdmins = async (_req: Request, res: Response): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPERADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, 200, 'Berhasil memuat daftar akun staf admin', admins);
  } catch (error) {
    sendError(res, 500, 'Gagal mengambil data admin', (error as Error).message);
  }
};

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      sendError(res, 400, 'Nama lengkap, email, dan kata sandi awal wajib diisi');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 409, 'Email staf telah terdaftar');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN',
        phone,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        is_active: true,
        created_at: true,
      },
    });

    // Catat tindakan ke audit log
    const superadminId = req.user?.id;
    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_CREATE',
          description: `Superadmin membuat akun admin baru: ${email} (${newAdmin.role})`,
        },
      });
    }

    // Kirim kredensial awal secara otomatis via email Resend
    await sendAdminCredentialsEmail(email, name, password);

    sendSuccess(res, 201, 'Akun staf admin berhasil dibuat dan kredensial dikirimkan via email', newAdmin);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat akun staf admin', (error as Error).message);
  }
};

export const deactivateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = parseInt(String(req.params.id), 10);
    const superadminId = req.user?.id;

    if (adminId === superadminId) {
      sendError(res, 400, 'Tidak dapat menonaktifkan akun sendiri');
      return;
    }

    const admin = await prisma.user.update({
      where: { id: adminId },
      data: { is_active: false },
    });

    // Catat ke Redis blacklist untuk membatalkan seluruh sesi token aktif user ini
    await redis.set(`user_revoked:${adminId}`, 'true', 'EX', 86400);

    // Catat ke audit log
    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_DEACTIVATE',
          description: `Superadmin menonaktifkan akun staf: ${admin.email}`,
        },
      });
    }

    sendSuccess(res, 200, 'Akses staf berhasil dinonaktifkan seketika dan token dicabut', {
      id: admin.id,
      email: admin.email,
      is_active: admin.is_active,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal menonaktifkan staf', (error as Error).message);
  }
};

export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = parseInt(String(req.params.id), 10);
    const superadminId = req.user?.id;

    if (adminId === superadminId) {
      sendError(res, 400, 'Tidak dapat menghapus akun sendiri');
      return;
    }

    // Periksa apakah admin pernah memiliki riwayat penugasan atau tindakan tercatat
    const [actionCount, uploadCount] = await Promise.all([
      prisma.auditLog.count({ where: { admin_id: adminId } }),
      prisma.projectDocument.count({ where: { uploaded_by: adminId } }),
    ]);

    if (actionCount > 0 || uploadCount > 0) {
      sendError(
        res,
        400,
        'Akun ini memiliki riwayat pekerjaan/audit trail tercatat. Untuk menjaga integritas sistem, akun hanya boleh dinonaktifkan (Soft Delete), bukan dihapus permanen.'
      );
      return;
    }

    await prisma.user.delete({ where: { id: adminId } });

    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_DELETE_PERMANENT',
          description: `Superadmin menghapus permanen akun staf tanpa riwayat (ID: ${adminId})`,
        },
      });
    }

    sendSuccess(res, 200, 'Akun staf tanpa riwayat berhasil dihapus permanen');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus admin', (error as Error).message);
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { admin_id, client_id, project_id, action, start_date, end_date } = req.query;

    const where: Record<string, unknown> = {};

    if (admin_id) where.admin_id = Number(admin_id);
    if (client_id) where.client_id = Number(client_id);
    if (project_id) where.project_id = Number(project_id);
    if (action) where.action = String(action);

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) (where.created_at as Record<string, unknown>).gte = new Date(String(start_date));
      if (end_date) (where.created_at as Record<string, unknown>).lte = new Date(String(end_date));
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            company_name: true,
          },
        },
        project: {
          select: {
            id: true,
            project_code: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    sendSuccess(res, 200, 'Berhasil memuat riwayat log audit', logs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat log audit', (error as Error).message);
  }
};

export const exportAuditLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { name: true, email: true } },
        client: { select: { name: true, company_name: true } },
        project: { select: { project_code: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Format data siap ekspor
    const exportData = logs.map((log) => ({
      id: log.id,
      timestamp: log.created_at.toISOString(),
      admin: log.admin?.name || log.admin?.email,
      klien: log.client?.name || '-',
      tiket: log.project?.project_code || '-',
      status_sebelum: log.status_before || '-',
      status_sesudah: log.status_after || '-',
      file: log.file_name || '-',
      deskripsi: log.description,
    }));

    sendSuccess(res, 200, 'Data log audit siap diekspor', exportData);
  } catch (error) {
    sendError(res, 500, 'Gagal mengekspor log audit', (error as Error).message);
  }
};
