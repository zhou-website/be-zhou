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
    const { name, email, password, role, phone } = req.body || {};

    if (!name || !email || !password) {
      sendError(res, 400, 'Nama lengkap, email, dan kata sandi awal wajib diisi', [
        ...(!name ? [{ field: 'name', message: 'Nama lengkap wajib diisi' }] : []),
        ...(!email ? [{ field: 'email', message: 'Email wajib diisi' }] : []),
        ...(!password ? [{ field: 'password', message: 'Kata sandi awal wajib diisi' }] : []),
      ]);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      sendError(res, 400, 'Format email tidak valid (contoh: staf@zhouconsulting.com)', [
        { field: 'email', message: 'Format email tidak valid (contoh: staf@zhouconsulting.com)' },
      ]);
      return;
    }

    const passStr = String(password).trim();
    if (passStr.length < 8 || !/[A-Z]/.test(passStr) || !/\d/.test(passStr)) {
      sendError(res, 400, 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka', [
        { field: 'password', message: 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka' },
      ]);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      sendError(res, 409, `Email ${email} sudah terdaftar`, [
        { field: 'email', message: `Email ${email} sudah terdaftar` },
      ]);
      return;
    }

    const hashedPassword = await bcrypt.hash(passStr, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN',
        phone: phone ? String(phone).trim() : null,
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
          description: `Superadmin membuat akun admin baru: ${normalizedEmail} (${newAdmin.role})`,
        },
      });
    }

    // Kirim kredensial awal secara otomatis via email Resend
    const emailResult = await sendAdminCredentialsEmail(normalizedEmail, String(name).trim(), passStr);

    sendSuccess(
      res,
      201,
      emailResult.success
        ? 'Akun staf admin berhasil dibuat dan kredensial dikirimkan via email'
        : 'Akun staf admin berhasil dibuat (pengiriman email onboarding diproses)',
      newAdmin
    );
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

export const deleteAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_id, client_id, project_id, before_date } = req.query;

    const where: Record<string, unknown> = {};
    if (id) {
      const parsedId = parseInt(String(id), 10);
      if (isNaN(parsedId)) {
        sendError(res, 400, 'ID log audit tidak valid');
        return;
      }
      where.id = parsedId;
    } else {
      if (admin_id) where.admin_id = Number(admin_id);
      if (client_id) where.client_id = Number(client_id);
      if (project_id) where.project_id = Number(project_id);
      if (before_date) {
        where.created_at = { lte: new Date(String(before_date)) };
      }
    }

    const deleteResult = await prisma.auditLog.deleteMany({
      where,
    });

    sendSuccess(res, 200, 'Riwayat log audit berhasil dihapus dari database server', {
      deleted_count: deleteResult.count,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus log audit dari database', (error as Error).message);
  }
};

export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = parseInt(String(req.params.id), 10);
    const superadminId = req.user?.id;
    const { name, email, role, phone, password, new_password, is_active, status } = req.body || {};

    if (isNaN(adminId)) {
      sendError(res, 400, 'ID staf admin tidak valid');
      return;
    }

    const existingAdmin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!existingAdmin) {
      sendError(res, 404, 'Akun staf admin tidak ditemukan');
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        sendError(res, 400, 'Format email tidak valid (contoh: staf@zhouconsulting.com)', [
          { field: 'email', message: 'Format email tidak valid (contoh: staf@zhouconsulting.com)' },
        ]);
        return;
      }

      if (normalizedEmail !== existingAdmin.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (emailTaken) {
          sendError(res, 409, `Email ${email} sudah terdaftar`, [
            { field: 'email', message: `Email ${email} sudah terdaftar` },
          ]);
          return;
        }
        updateData.email = normalizedEmail;
      }
    }

    if (phone !== undefined) updateData.phone = String(phone).trim();
    if (role !== undefined) updateData.role = role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';

    // Mendukung is_active (boolean) maupun status ('ACTIVE' | 'INACTIVE') dari Frontend
    let targetActive: boolean | undefined;
    if (is_active !== undefined) {
      targetActive = Boolean(is_active);
    } else if (status !== undefined) {
      const s = String(status).toUpperCase();
      targetActive = s === 'ACTIVE' || s === 'AKTIF' || s === 'TRUE';
    }
    if (targetActive !== undefined) {
      updateData.is_active = targetActive;
    }

    // Pembaruan Password staf di database server jika disertakan (tanpa memerlukan password lama)
    let passwordWasUpdated = false;
    const rawPassword = password !== undefined ? password : new_password;
    if (rawPassword !== undefined && rawPassword !== null) {
      const passStr = String(rawPassword).trim();
      if (passStr.length > 0) {
        if (passStr.length < 8 || !/[A-Z]/.test(passStr) || !/\d/.test(passStr)) {
          sendError(res, 400, 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka', [
            { field: 'password', message: 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka' },
          ]);
          return;
        }
        updateData.password = await bcrypt.hash(passStr, 10);
        passwordWasUpdated = true;
      }
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: updateData,
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
    });

    // Jika akun dinonaktifkan, batalkan sesi aktif di Redis seketika
    if (targetActive === false) {
      try {
        await redis.set(`user_revoked:${adminId}`, 'true', 'EX', 86400);
      } catch (redisErr) {
        console.warn('⚠️ Redis set user_revoked skipped:', (redisErr as Error).message);
      }
    } else if (targetActive === true) {
      try {
        await redis.del(`user_revoked:${adminId}`);
      } catch (redisErr) {
        console.warn('⚠️ Redis del user_revoked skipped:', (redisErr as Error).message);
      }
    }

    if (superadminId) {
      const passNote = passwordWasUpdated ? ' (termasuk pembaruan kata sandi staf)' : '';
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_UPDATE',
          description: `Superadmin memperbarui akun staf: ${updated.email} (${updated.name})${passNote}`,
        },
      });
    }

    sendSuccess(res, 200, 'Data staf admin & kredensial berhasil diperbarui di database server', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui data admin', (error as Error).message);
  }
};

/**
 * Endpoint khusus reset / ganti kata sandi staf admin oleh Superadmin
 * Tidak memerlukan password lama
 */
export const resetAdminPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = parseInt(String(req.params.id), 10);
    const superadminId = req.user?.id;
    const { password, new_password } = req.body || {};

    if (isNaN(adminId)) {
      sendError(res, 400, 'ID staf admin tidak valid');
      return;
    }

    const targetPassword = password !== undefined ? password : new_password;
    if (!targetPassword) {
      sendError(res, 400, 'Kata sandi baru wajib disertakan', [
        { field: 'password', message: 'Kata sandi baru wajib disertakan' },
      ]);
      return;
    }

    const passStr = String(targetPassword).trim();
    if (passStr.length < 8 || !/[A-Z]/.test(passStr) || !/\d/.test(passStr)) {
      sendError(res, 400, 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka', [
        { field: 'password', message: 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka' },
      ]);
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true, is_active: true },
    });

    if (!existingAdmin) {
      sendError(res, 404, 'Akun staf admin tidak ditemukan');
      return;
    }

    const hashedPassword = await bcrypt.hash(passStr, 10);
    await prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    // Catat ke audit log
    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_PASSWORD_RESET',
          description: `Superadmin mereset kata sandi staf: ${existingAdmin.email} (${existingAdmin.name})`,
        },
      });
    }

    sendSuccess(res, 200, 'Kata sandi staf admin berhasil diperbarui', {
      id: existingAdmin.id,
      name: existingAdmin.name,
      email: existingAdmin.email,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui kata sandi staf admin', (error as Error).message);
  }
};

export const reactivateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = parseInt(String(req.params.id), 10);
    const superadminId = req.user?.id;

    const admin = await prisma.user.update({
      where: { id: adminId },
      data: { is_active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
      },
    });

    try {
      await redis.del(`user_revoked:${adminId}`);
    } catch (redisErr) {
      console.warn('⚠️ Redis del user_revoked skipped:', (redisErr as Error).message);
    }

    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          action: 'ADMIN_REACTIVATE',
          description: `Superadmin mengaktifkan kembali akun staf: ${admin.email}`,
        },
      });
    }

    sendSuccess(res, 200, 'Akun staf berhasil diaktifkan kembali', admin);
  } catch (error) {
    sendError(res, 500, 'Gagal mengaktifkan kembali staf', (error as Error).message);
  }
};

