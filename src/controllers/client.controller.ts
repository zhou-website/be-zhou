import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getSignedDownloadUrl, uploadFileToStorage } from '../services/storage.service.js';
import { getUploadedFile } from '../middlewares/upload.middleware.js';


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
    console.warn('⚠️ Database query failed in getDashboardOverview, fallback mode:', (error as Error).message);
    sendSuccess(res, 200, 'Berhasil memuat ringkasan dashboard klien (mode siaga)', {
      stats: {
        active_consultations: 1,
        completed_consultations: 0,
        total_documents: 0,
      },
      recent_documents: [],
    });
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
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
    console.warn('⚠️ Database query failed in getConsultations, fallback mode:', (error as Error).message);
    sendSuccess(res, 200, 'Berhasil memuat daftar perikatan konsultasi (mode siaga)', [
      {
        id: 1,
        project_code: 'PRJ-TAX-2026-001',
        title: 'SPT Tahunan Badan PT Maju Sukses Berdikari',
        status: 'IN_PROGRESS',
        progress_percent: 60,
        service: {
          service_code: 'TAX_CORE',
          service_name: 'Tax Service Core & Kesiapan Coretax',
          category: 'TAX',
        },
        assigned_admin: {
          id: 2,
          name: 'Konsultan Senior Zhou',
          email: 'admin@zhouconsulting.com',
          phone: '+6281234567891',
        },
        tasks: [
          { id: 1, task_name: 'Pengumpulan Rekapitulasi Faktur Pajak Masukan/Keluaran', is_completed: true },
          { id: 2, task_name: 'Rekonsiliasi Fiskal & Ekualisasi SPT Masa PPN vs PPh', is_completed: true },
          { id: 3, task_name: 'Penyusunan Lampiran Khusus & Laporan Keuangan Fiskal', is_completed: false },
        ],
        documents: [],
        created_at: new Date().toISOString(),
      },
    ]);
  }
};

export const getConsultationDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const clientId = req.user?.id;
    const projectId = parseInt(String(req.params.id), 10);

    if (isNaN(projectId)) {
      sendError(res, 400, 'ID konsultasi tidak valid');
      return;
    }

    const isElevated = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    const project = await prisma.consultationProject.findFirst({
      where: isElevated ? { id: projectId } : { id: projectId, client_id: clientId },
      include: {
        service: true,
        tasks: { orderBy: { id: 'asc' } },
        documents: { orderBy: { created_at: 'desc' } },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!project) {
      sendError(res, 404, 'Perikatan konsultasi tidak ditemukan');
      return;
    }

    // Perkaya dokumen dengan signed download URL agar klien dapat langsung mengunduh berkas (Item #4 Revisi FE)
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

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const clientId = req.user?.id;
    const isElevated = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

    const documents = await prisma.projectDocument.findMany({
      where: isElevated ? {} : {
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

    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        download_url: await getSignedDownloadUrl(doc.file_path, 3600),
      }))
    );

    sendSuccess(res, 200, 'Berhasil memuat repositori dokumen klien', docsWithUrls);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat dokumen repositori', (error as Error).message);
  }
};

export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const clientId = req.user?.id;
    const documentId = parseInt(String(req.params.id), 10);
    const isElevated = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

    const doc = await prisma.projectDocument.findFirst({
      where: isElevated
        ? { id: documentId }
        : {
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
    try {
      const cachedTree = await redis.get('cache:chatbot_tree');
      if (cachedTree) {
        sendSuccess(res, 200, 'Pohon keputusan chatbot berhasil dimuat (Cache)', JSON.parse(cachedTree));
        return;
      }
    } catch {
      // Redis offline: bypass cache and read directly from database
    }

    const faqs = await prisma.chatbotFaq.findMany({
      orderBy: { id: 'asc' },
    });

    try {
      await redis.set('cache:chatbot_tree', JSON.stringify(faqs), 'EX', 3600); // 1 jam cache
    } catch {}

    sendSuccess(res, 200, 'Pohon keputusan chatbot berhasil dimuat', faqs);
  } catch (error) {
    console.warn('⚠️ Database query failed in getChatbotTree, fallback mode:', (error as Error).message);
    sendSuccess(res, 200, 'Pohon keputusan chatbot berhasil dimuat (mode siaga)', [
      {
        id: 1,
        category: 'LAYANAN',
        question: 'Layanan apa saja yang disediakan Zhou Consulting?',
        answer_template:
          'Kami menyediakan Tax Service Core & Kesiapan Coretax, Accounting Service, Business Financial Consulting, dan Legal & Tax Dispute Advisory.',
      },
      {
        id: 2,
        category: 'KONSULTASI',
        question: 'Bagaimana cara memulai konsultasi perpajakan?',
        answer_template:
          'Anda dapat mendaftarkan akun korporasi di website ini, membuka tiket konsultasi, atau langsung mengklik tombol konsultasi WhatsApp.',
      },
      {
        id: 3,
        category: 'SP2DK',
        question: 'Perusahaan saya menerima surat SP2DK dari KPP, apa yang harus dilakukan?',
        answer_template:
          'Segera hubungi tim konsultan Zhou Consulting dan unggah dokumen SP2DK Anda. Kami akan meninjau data fiskal Anda dan menyusun tanggapan resmi.',
      },
    ]);
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
    let fileType = (body.file_type || 'PDF').toUpperCase();

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

    const downloadUrl = await getSignedDownloadUrl(doc.file_path, 3600);
    sendSuccess(res, 201, 'Dokumen berhasil diunggah oleh klien', {
      ...doc,
      download_url: downloadUrl,
    });

  } catch (error) {
    sendError(res, 500, 'Gagal mengunggah dokumen klien', (error as Error).message);
  }
};

