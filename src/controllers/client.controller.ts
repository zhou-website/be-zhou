import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getSignedDownloadUrl, uploadFileToStorage } from '../services/storage.service.js';

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      sendError(res, 401, 'Tidak terotentikasi');
      return;
    }

    const [activeProjects, completedProjects, recentDocuments] = await Promise.all([
      prisma.consultationProject.count({
        where: { client_id: clientId, status: 'IN_PROGRESS' },
      }),
      prisma.consultationProject.count({
        where: { client_id: clientId, status: 'COMPLETED' },
      }),
      prisma.projectDocument.findMany({
        where: {
          project: {
            client_id: clientId,
          },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          project: {
            select: {
              project_code: true,
              title: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, 200, 'Berhasil memuat ringkasan dashboard klien', {
      stats: {
        active_consultations: activeProjects,
        completed_consultations: completedProjects,
        total_documents: recentDocuments.length,
      },
      recent_documents: recentDocuments,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat overview dashboard', (error as Error).message);
  }
};

export const getConsultations = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const status = req.query.status as string | undefined;

    const whereCondition: Record<string, unknown> = { client_id: clientId };
    if (status) {
      whereCondition.status = status;
    }

    const projects = await prisma.consultationProject.findMany({
      where: whereCondition,
      include: {
        service: {
          select: {
            service_code: true,
            service_name: true,
            category: true,
          },
        },
        tasks: {
          select: {
            id: true,
            task_name: true,
            is_completed: true,
          },
        },
        documents: {
          select: {
            id: true,
            file_name: true,
            file_type: true,
            file_size: true,
            created_at: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    sendSuccess(res, 200, 'Berhasil memuat daftar perikatan konsultasi', projects);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat perikatan konsultasi', (error as Error).message);
  }
};

export const getConsultationDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);

    const project = await prisma.consultationProject.findFirst({
      where: {
        id: projectId,
        client_id: clientId,
      },
      include: {
        service: true,
        tasks: true,
        documents: true,
      },
    });

    if (!project) {
      sendError(res, 404, 'Perikatan konsultasi tidak ditemukan');
      return;
    }

    sendSuccess(res, 200, 'Berhasil memuat detail konsultasi', project);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail konsultasi', (error as Error).message);
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;

    const documents = await prisma.projectDocument.findMany({
      where: {
        project: {
          client_id: clientId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            project_code: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, 200, 'Berhasil memuat repositori dokumen klien', documents);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat dokumen repositori', (error as Error).message);
  }
};

export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const documentId = parseInt(String(req.params.id), 10);

    const doc = await prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        project: {
          client_id: clientId,
        },
      },
    });

    if (!doc) {
      sendError(res, 404, 'Dokumen tidak ditemukan atau Anda tidak memiliki hak akses');
      return;
    }

    // Mengembalikan signed URL berbatas waktu dari Supabase Storage (PRD Requirement #10)
    const downloadUrl = await getSignedDownloadUrl(doc.file_path, 3600);

    sendSuccess(res, 200, 'Signed download URL berhasil digenerate', {
      file_name: doc.file_name,
      file_type: doc.file_type,
      download_url: downloadUrl,
      expires_in_seconds: 3600,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat tautan unduh dokumen', (error as Error).message);
  }
};

export const getChatbotTree = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cachedTree = await redis.get('cache:chatbot_tree');
    if (cachedTree) {
      sendSuccess(res, 200, 'Pohon keputusan chatbot berhasil dimuat (Cache)', JSON.parse(cachedTree));
      return;
    }

    const faqs = await prisma.chatbotFaq.findMany({
      orderBy: { id: 'asc' },
    });

    await redis.set('cache:chatbot_tree', JSON.stringify(faqs), 'EX', 3600); // 1 jam cache
    sendSuccess(res, 200, 'Pohon keputusan chatbot berhasil dimuat', faqs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat FAQ chatbot', (error as Error).message);
  }
};

export const escalateChatbot = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const { category, answered_node, last_message, service_id, title } = req.body || {};

    if (!clientId) {
      sendError(res, 401, 'Otorisasi gagal');
      return;
    }

    const code = `TCK-${Date.now().toString().slice(-6)}`;
    const defaultService = service_id || (await prisma.service.findFirst())?.id || 1;

    const description = `Eskalasi Otomatis dari Chatbot Bantuan:
Kategori: ${category || '-'}
Node Terakhir: ${answered_node || '-'}
Pesan Klien: ${last_message || '-'}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: clientId,
        service_id: defaultService,
        title: title || `Konsultasi Baru (${category || 'Umum'})`,
        description,
        status: 'IN_PROGRESS',
      },
    });

    sendSuccess(res, 201, 'Eskalasi chatbot berhasil dibuat menjadi perikatan konsultasi baru', newProject);
  } catch (error) {
    sendError(res, 500, 'Gagal melakukan eskalasi tiket chatbot', (error as Error).message);
  }
};

export const uploadClientDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);
    const body = req.body || {};

    if (!clientId) {
      sendError(res, 401, 'Tidak terotentikasi');
      return;
    }

    // Pastikan tiket perikatan memang milik klien tersebut (kecuali admin/superadmin)
    const userRole = (req.user?.role || '').toUpperCase();
    const isElevated = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    const project = await prisma.consultationProject.findFirst({
      where: isElevated ? { id: projectId } : { id: projectId, client_id: clientId },
    });

    if (!project) {
      sendError(res, 404, 'Tiket konsultasi tidak ditemukan atau Anda tidak memiliki akses');
      return;
    }

    let fileName = body.file_name;
    let filePath = body.file_path;
    let fileSize = body.file_size || '0 KB';
    let fileType = body.file_type || 'PDF';

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
      sendError(res, 400, 'Nama berkas dan berkas upload wajib disertakan');
      return;
    }

    const doc = await prisma.projectDocument.create({
      data: {
        project_id: projectId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        uploaded_by: clientId,
      },
    });

    sendSuccess(res, 201, 'Dokumen berhasil diunggah oleh klien', doc);
  } catch (error) {
    sendError(res, 500, 'Gagal mengunggah dokumen klien', (error as Error).message);
  }
};

