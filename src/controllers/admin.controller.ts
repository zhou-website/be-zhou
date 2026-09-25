import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadFileToStorage } from '../services/storage.service.js';

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
    sendError(res, 500, 'Gagal memuat overview admin', (error as Error).message);
  }
};

export const getConsultations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, search } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as string;
    if (category) {
      where.service = { category: category as string };
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { project_code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.consultationProject.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company_name: true,
          },
        },
        service: true,
        tasks: true,
        documents: true,
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, 200, 'Berhasil mengambil daftar konsultasi', projects);
  } catch (error) {
    sendError(res, 500, 'Gagal mengambil daftar konsultasi', (error as Error).message);
  }
};

export const createConsultation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { client_id, service_id, title, description, initial_tasks } = req.body || {};

    if (!client_id || !service_id || !title) {
      sendError(res, 400, 'Client, jenis layanan, dan judul konsultasi wajib diisi');
      return;
    }

    const code = `ZHOU-${Date.now().toString().slice(-6)}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: Number(client_id),
        service_id: Number(service_id),
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
    let fileType = body.file_type || 'PDF';

    // Jika diunggah langsung melalui form-data/multipart
    if (req.file) {
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;
      fileType = req.file.mimetype.includes('pdf')
        ? 'PDF'
        : req.file.mimetype.includes('spreadsheet') || req.file.mimetype.includes('excel')
        ? 'XLSX'
        : 'DOCX';
      const uploadResult = await uploadFileToStorage(fileName, req.file.buffer, req.file.mimetype);
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

    sendSuccess(res, 201, 'Dokumen perikatan berhasil diunggah', doc);
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

    sendSuccess(res, 200, 'Berhasil memuat repositori dokumen global', documents);
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

