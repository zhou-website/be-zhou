import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadFileToStorage, getSignedDownloadUrl } from '../services/storage.service.js';
import { getUploadedFile } from '../middlewares/upload.middleware.js';


export const getDashboardOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalProjects, activeProjects, completedProjects, totalClients, totalDocs] = await Promise.all([
      prisma.consultationProject.count(),
      prisma.consultationProject.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.consultationProject.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.projectDocument.count(),
    ]);

    sendSuccess(res, 200, 'Berhasil memuat statistik operasional admin', {
      total_consultations: totalProjects,
      active_consultations: activeProjects,
      completed_consultations: completedProjects,
      total_clients: totalClients,
      total_documents: totalDocs,
    });
  } catch (error) {
    console.warn('⚠️ Database query failed in admin getDashboardOverview, fallback mode:', (error as Error).message);
    sendSuccess(res, 200, 'Berhasil memuat statistik operasional admin (mode siaga)', {
      total_consultations: 1,
      active_consultations: 1,
      completed_consultations: 0,
      total_clients: 1,
      total_documents: 0,
    });
  }
};

export const getConsultations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const { category, status, search, assigned_admin_id } = req.query;

    const andConditions: Record<string, unknown>[] = [];
    if (status) andConditions.push({ status: status as string });
    if (category) {
      andConditions.push({ service: { category: category as string } });
    }
    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search as string, mode: 'insensitive' } },
          { project_code: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }

    // Penugasan & Hak Akses PIC:
    // Admin dapat melihat tiket yang ditugaskan kepada dirinya ATAU tiket baru yang belum dialokasikan PIC (unassigned).
    // Superadmin memiliki akses penuh ke seluruh tiket dan dapat memfilter berdasarkan PIC.
    if (userRole === 'ADMIN') {
      andConditions.push({
        OR: [
          { assigned_admin_id: userId },
          { assigned_admin_id: null },
        ],
      });
    } else if (assigned_admin_id) {
      andConditions.push({ assigned_admin_id: Number(assigned_admin_id) });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const projects = await prisma.consultationProject.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company_name: true,
            phone: true,
          },
        },
        service: true,
        tasks: true,
        documents: true,
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const safeProjects = projects.map((p) => ({
      ...p,
      client: p.client
        ? {
            ...p.client,
            company_name: p.client.company_name || p.client.name || 'Perusahaan Klien',
          }
        : undefined,
    }));

    sendSuccess(res, 200, 'Berhasil mengambil daftar konsultasi', safeProjects);
  } catch (error) {
    console.warn('⚠️ Database query failed in admin getConsultations, fallback mode:', (error as Error).message);
    sendSuccess(res, 200, 'Berhasil mengambil daftar konsultasi (mode siaga)', []);
  }
};

export const createConsultation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { client_id, service_id, title, description, initial_tasks, assigned_admin_id, admin_id } = req.body || {};

    if (!client_id || !service_id || !title) {
      sendError(res, 400, 'Client, jenis layanan, dan judul konsultasi wajib diisi');
      return;
    }

    const targetAdminId = assigned_admin_id || admin_id;

    const code = `ZHOU-${Date.now().toString().slice(-6)}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: Number(client_id),
        service_id: Number(service_id),
        assigned_admin_id: targetAdminId ? Number(targetAdminId) : null,
        title,
        description,
        status: 'IN_PROGRESS',
        tasks: Array.isArray(initial_tasks)
          ? {
              create: initial_tasks.map((name: string) => ({
                task_name: name,
                is_completed: false,
              })),
            }
          : undefined,
      },
      include: {
        tasks: true,
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    sendSuccess(res, 201, 'Perikatan konsultasi berhasil dibuat', newProject);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat perikatan konsultasi', (error as Error).message);
  }
};

export const updateConsultationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);
    const { status } = req.body || {};

    if (!status || !['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      sendError(res, 400, 'Status baru tidak valid (pilih IN_PROGRESS atau COMPLETED)');
      return;
    }

    const currentProject = await prisma.consultationProject.findUnique({
      where: { id: projectId },
      include: { tasks: true },
    });

    if (!currentProject) {
      sendError(res, 404, 'Proyek konsultasi tidak ditemukan');
      return;
    }

    // Jika ingin mengubah ke COMPLETED, periksa apakah seluruh checklist tugas sudah selesai
    if (status === 'COMPLETED') {
      const hasUnfinishedTasks = currentProject.tasks.some((t) => !t.is_completed);
      if (hasUnfinishedTasks) {
        sendError(
          res,
          400,
          'Semua item checklist penugasan harus dicentang selesai sebelum menandai status perikatan sebagai Completed'
        );
        return;
      }
    }

    const statusBefore = currentProject.status;

    // Update status project
    const updated = await prisma.consultationProject.update({
      where: { id: projectId },
      data: { status },
    });

    // Catat ke append-only audit log
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: adminId,
          client_id: currentProject.client_id,
          project_id: currentProject.id,
          action: 'STATUS_UPDATE',
          status_before: statusBefore,
          status_after: status,
          description: `Perubahan status perikatan [${currentProject.project_code}] dari ${statusBefore} menjadi ${status}`,
        },
      });
    }

    sendSuccess(res, 200, 'Status konsultasi berhasil diperbarui dan dicatat ke audit log', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui status perikatan', (error as Error).message);
  }
};

export const updateConsultation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);

    if (isNaN(projectId)) {
      sendError(res, 400, 'ID perikatan konsultasi tidak valid');
      return;
    }

    const currentProject = await prisma.consultationProject.findUnique({
      where: { id: projectId },
      include: {
        tasks: true,
        assigned_admin: true,
      },
    });

    if (!currentProject) {
      sendError(res, 404, 'Perikatan konsultasi tidak ditemukan');
      return;
    }

    // Hak akses PIC: Admin biasa hanya boleh memperbarui tiket yang ditugaskan kepadanya atau belum bertuan
    if (userRole === 'ADMIN' && currentProject.assigned_admin_id !== null && currentProject.assigned_admin_id !== userId) {
      sendError(res, 403, 'Akses ditolak: Anda bukan PIC Admin yang ditugaskan untuk tiket perikatan ini');
      return;
    }

    const {
      progress_percent,
      progress,
      progres,
      assigned_admin_id,
      admin_id,
      pic_id,
      description,
      notes,
      catatan,
      status,
      title,
    } = req.body || {};

    const updateData: Record<string, unknown> = {};

    // 1. Update Progres (progress_percent: 0-100)
    const rawProgress = progress_percent !== undefined ? progress_percent : (progress !== undefined ? progress : progres);
    if (rawProgress !== undefined && rawProgress !== null && rawProgress !== '') {
      const parsedProgress = parseInt(String(rawProgress), 10);
      if (isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
        sendError(res, 400, 'Nilai progres harus berupa angka antara 0 hingga 100');
        return;
      }
      updateData.progress_percent = parsedProgress;
    }

    // 2. Update Catatan Konsultasi (description)
    const rawNotes = description !== undefined ? description : (notes !== undefined ? notes : catatan);
    if (rawNotes !== undefined) {
      updateData.description = typeof rawNotes === 'string' ? rawNotes : String(rawNotes);
    }

    // 3. Update Title (jika disertakan)
    if (title !== undefined && String(title).trim().length > 0) {
      updateData.title = String(title).trim();
    }

    // 4. Update PIC Admin (assigned_admin_id)
    const rawPic = assigned_admin_id !== undefined ? assigned_admin_id : (pic_id !== undefined ? pic_id : admin_id);
    let targetPicAdmin: { id: number; name: string; email: string } | null = null;

    if (rawPic !== undefined && rawPic !== null && rawPic !== '') {
      const targetAdminId = parseInt(String(rawPic), 10);
      if (isNaN(targetAdminId)) {
        sendError(res, 400, 'ID PIC Admin tidak valid');
        return;
      }

      // Validasi wewenang: Hanya Superadmin yang berwenang menugaskan / mereassign PIC ke staf lain
      if (userRole !== 'SUPERADMIN' && targetAdminId !== userId) {
        sendError(res, 403, 'Hanya Superadmin yang berwenang menugaskan atau mengubah PIC tiket ke staf lain');
        return;
      }

      const adminUser = await prisma.user.findFirst({
        where: { id: targetAdminId, role: { in: ['ADMIN', 'SUPERADMIN'] }, is_active: true },
        select: { id: true, name: true, email: true },
      });

      if (!adminUser) {
        sendError(res, 404, 'PIC Admin staf tidak ditemukan atau akun sedang dinonaktifkan');
        return;
      }

      targetPicAdmin = adminUser;
      updateData.assigned_admin_id = targetAdminId;
    }

    // 5. Update Status (jika disertakan)
    if (status !== undefined) {
      const normalizedStatus = String(status).toUpperCase();
      if (!['IN_PROGRESS', 'COMPLETED'].includes(normalizedStatus)) {
        sendError(res, 400, 'Status baru tidak valid (pilih IN_PROGRESS atau COMPLETED)');
        return;
      }

      if (normalizedStatus === 'COMPLETED') {
        const hasUnfinishedTasks = currentProject.tasks.some((t) => !t.is_completed);
        if (hasUnfinishedTasks) {
          sendError(
            res,
            400,
            'Semua item checklist penugasan harus dicentang selesai sebelum menandai status perikatan sebagai Completed'
          );
          return;
        }
      }

      updateData.status = normalizedStatus;
    }

    // Eksekusi pembaruan ke PostgreSQL
    const updatedProject = await prisma.consultationProject.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company_name: true,
            phone: true,
          },
        },
        service: true,
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        tasks: { orderBy: { id: 'asc' } },
        documents: { orderBy: { created_at: 'desc' } },
      },
    });

    // Catat ke append-only audit log
    if (userId) {
      const auditParts: string[] = [];
      if (updateData.progress_percent !== undefined) auditParts.push(`progres ${updateData.progress_percent}%`);
      if (updateData.assigned_admin_id !== undefined && targetPicAdmin) {
        auditParts.push(`PIC: ${targetPicAdmin.name}`);
      }
      if (updateData.description !== undefined) auditParts.push('catatan konsultasi diperbarui');
      if (updateData.status !== undefined) auditParts.push(`status: ${updateData.status}`);

      const auditSummary = auditParts.length > 0 ? auditParts.join(', ') : 'progres & lembar kerja diperbarui';

      await prisma.auditLog.create({
        data: {
          admin_id: userId,
          client_id: currentProject.client_id,
          project_id: currentProject.id,
          action: 'CONSULTATION_UPDATE',
          status_before: currentProject.status,
          status_after: (updateData.status as string) || currentProject.status,
          description: `Admin memperbarui tiket perikatan [${currentProject.project_code}]: ${auditSummary}`,
        },
      });
    }

    // Generate signed download URLs untuk berkas dokumen
    const docsWithUrls = await Promise.all(
      updatedProject.documents.map(async (doc) => ({
        ...doc,
        download_url: await getSignedDownloadUrl(doc.file_path, 3600),
      }))
    );

    sendSuccess(res, 200, 'Data konsultasi (progres, PIC, dan catatan) berhasil diperbarui di server', {
      ...updatedProject,
      documents: docsWithUrls,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui data konsultasi', (error as Error).message);
  }
};

export const addProjectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const { task_name } = req.body || {};

    if (!task_name) {
      sendError(res, 400, 'Nama tugas checklist wajib diisi');
      return;
    }

    const task = await prisma.projectTask.create({
      data: {
        project_id: projectId,
        task_name,
        is_completed: false,
      },
    });

    sendSuccess(res, 201, 'Checklist tugas baru berhasil ditambahkan', task);
  } catch (error) {
    sendError(res, 500, 'Gagal menambahkan tugas checklist', (error as Error).message);
  }
};

export const toggleProjectTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = parseInt(String(req.params.taskId), 10);
    const { is_completed } = req.body || {};

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        is_completed: Boolean(is_completed),
      },
    });

    sendSuccess(res, 200, 'Status checklist berhasil diperbarui', task);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui checklist tugas', (error as Error).message);
  }
};

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);
    const body = req.body || {};
    
    let fileName = body.file_name;
    let filePath = body.file_path;
    let fileSize = body.file_size || '0 KB';
    let fileType = (body.file_type || 'PDF').toUpperCase();

    // Jika diunggah langsung melalui form-data/multipart
    const file = getUploadedFile(req);
    if (file) {
      fileName = body.file_name || file.originalname;
      fileSize = `${(file.size / 1024).toFixed(1)} KB`;
      const ext = path.extname(file.originalname).toLowerCase();
      const detected = ext.includes('xls') ? 'XLSX' : ext.includes('doc') ? 'DOCX' : ext.includes('png') || ext.includes('jp') ? 'IMAGE' : 'PDF';
      fileType = (body.file_type || detected).toUpperCase();
      const uploadResult = await uploadFileToStorage(fileName, file.buffer, file.mimetype, 'documents');
      filePath = uploadResult.filePath;
    }

    if (!fileName || !filePath) {
      sendError(res, 400, 'Nama berkas dan path penyimpanan atau berkas upload wajib diisi');
      return;
    }

    const doc = await prisma.projectDocument.create({
      data: {
        project_id: projectId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        uploaded_by: adminId || 1,
      },
    });

    // Catat ke audit log
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: adminId,
          project_id: projectId,
          action: 'DOCUMENT_UPLOAD',
          file_name: fileName,
          description: `Unggah dokumen kerja perikatan: ${fileName}`,
        },
      });
    }

    const downloadUrl = await getSignedDownloadUrl(doc.file_path, 3600);
    sendSuccess(res, 201, 'Dokumen perikatan berhasil diunggah', {
      ...doc,
      download_url: downloadUrl,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal mengunggah dokumen kerja', (error as Error).message);
  }
};

export const getGlobalDocuments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const documents = await prisma.projectDocument.findMany({
      include: {
        project: {
          select: {
            id: true,
            project_code: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                company_name: true,
              },
            },
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Sertakan signed URL untuk masing-masing dokumen
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        download_url: await getSignedDownloadUrl(doc.file_path, 3600),
      }))
    );

    sendSuccess(res, 200, 'Berhasil memuat repositori dokumen global', docsWithUrls);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat repositori dokumen global', (error as Error).message);
  }
};


export const getClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company_name: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, 200, 'Berhasil memuat daftar klien', clients);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat daftar klien', (error as Error).message);
  }
};

export const getConsultationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);

    if (isNaN(projectId)) {
      sendError(res, 400, 'ID perikatan konsultasi tidak valid');
      return;
    }

    const project = await prisma.consultationProject.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company_name: true,
            phone: true,
          },
        },
        service: true,
        tasks: { orderBy: { id: 'asc' } },
        documents: { orderBy: { created_at: 'desc' } },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      sendError(res, 404, 'Perikatan konsultasi tidak ditemukan');
      return;
    }

    // Penugasan & Hak Akses PIC (Item #14 Revisi FE):
    // Admin selain PIC yang ditugaskan tidak dapat melihat/memantau tiket tersebut
    if (userRole === 'ADMIN' && project.assigned_admin_id !== userId) {
      sendError(res, 403, 'Akses ditolak: Anda bukan PIC Admin yang ditugaskan untuk tiket perikatan ini');
      return;
    }

    const docsWithUrls = await Promise.all(
      project.documents.map(async (doc) => ({
        ...doc,
        download_url: await getSignedDownloadUrl(doc.file_path, 3600),
      }))
    );

    sendSuccess(res, 200, 'Berhasil memuat detail konsultasi', {
      ...project,
      documents: docsWithUrls,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail konsultasi', (error as Error).message);
  }
};

export const assignConsultationPic = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const superadminId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);
    const { admin_id, assigned_admin_id } = req.body || {};

    // Sesuai Catatan Rapat FE (Item #13 & #15):
    // Superadmin mengassign tiket ke PIC Admin tertentu dan dapat mereassign ke PIC Admin baru
    if (userRole !== 'SUPERADMIN') {
      sendError(res, 403, 'Hanya Superadmin yang berwenang menugaskan atau mengubah penugasan PIC tiket konsultasi');
      return;
    }

    const targetAdminId = Number(assigned_admin_id || admin_id);
    if (!targetAdminId || isNaN(targetAdminId)) {
      sendError(res, 400, 'ID Admin PIC tujuan wajib disertakan');
      return;
    }

    const [project, targetAdmin] = await Promise.all([
      prisma.consultationProject.findUnique({
        where: { id: projectId },
        include: { assigned_admin: true },
      }),
      prisma.user.findFirst({
        where: { id: targetAdminId, role: { in: ['ADMIN', 'SUPERADMIN'] }, is_active: true },
      }),
    ]);

    if (!project) {
      sendError(res, 404, 'Tiket perikatan konsultasi tidak ditemukan');
      return;
    }

    if (!targetAdmin) {
      sendError(res, 404, 'Admin staf tidak ditemukan atau akun sedang dinonaktifkan');
      return;
    }

    const previousAdminName = project.assigned_admin?.name || 'Belum ditugaskan';
    const isReassign = Boolean(project.assigned_admin_id);

    const updated = await prisma.consultationProject.update({
      where: { id: projectId },
      data: { assigned_admin_id: targetAdminId },
      include: {
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (superadminId) {
      await prisma.auditLog.create({
        data: {
          admin_id: superadminId,
          client_id: project.client_id,
          project_id: project.id,
          action: isReassign ? 'TICKET_REASSIGNED' : 'TICKET_ASSIGNED',
          description: `Superadmin ${isReassign ? 'mengalihkan penugasan' : 'menugaskan'} tiket [${project.project_code}] dari [${previousAdminName}] ke PIC baru: [${targetAdmin.name}] (${targetAdmin.email})`,
        },
      });
    }

    sendSuccess(
      res,
      200,
      `Tiket konsultasi berhasil ${isReassign ? 'dialihkan ke PIC baru' : 'ditugaskan ke PIC'}`,
      updated
    );
  } catch (error) {
    sendError(res, 500, 'Gagal menugaskan PIC tiket konsultasi', (error as Error).message);
  }
};


