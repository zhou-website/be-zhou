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
    sendError(res, 500, 'Gagal memuat ringkasan dashboard klien', (error as Error).message);
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
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company_name: true,
            phone: true,
          },
        },
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

    const safeProjects = projects.map((p) => ({
      ...p,
      client: p.client
        ? {
            ...p.client,
            company_name: p.client.company_name || p.client.name || 'Perusahaan Klien',
          }
        : undefined,
    }));

    sendSuccess(res, 200, 'Berhasil memuat daftar perikatan konsultasi', safeProjects);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat daftar perikatan konsultasi', (error as Error).message);
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
    sendError(res, 500, 'Gagal memuat pohon keputusan chatbot', (error as Error).message);
  }
};

export const escalateChatbot = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    const body = req.body || {};
    const { category, answered_node, last_message, message, service_id } = body;
    let { title } = body;

    if (!clientId) {
      sendError(res, 401, 'Otorisasi gagal');
      return;
    }

    // Dukung fleksibel body message dari FE: `[Kategori] [Urgensi: X] Judul: Deskripsi`
    let rawMessage = (message || last_message || '').trim();
    let extractedCategory = category || 'Tax Service Core';
    let extractedUrgency = 'Normal';
    let extractedDesc = rawMessage;

    if (rawMessage.startsWith('[')) {
      const match = rawMessage.match(/^\[(.*?)\]\s*\[Urgensi:\s*(.*?)\]\s*(.*?):\s*([\s\S]*)$/i);
      if (match) {
        extractedCategory = match[1]?.trim() || extractedCategory;
        extractedUrgency = match[2]?.trim() || extractedUrgency;
        if (!title) {
          title = match[3]?.trim();
        }
        extractedDesc = match[4]?.trim() || rawMessage;
      }
    }

    if (!title) {
      title = `Konsultasi Baru (${extractedCategory})`;
    }

    // Resolve service
    let defaultService = service_id ? Number(service_id) : undefined;
    if (!defaultService && extractedCategory) {
      const matched = await prisma.service.findFirst({
        where: {
          OR: [
            { category: { contains: extractedCategory, mode: 'insensitive' } },
            { service_name: { contains: extractedCategory, mode: 'insensitive' } },
          ],
        },
      });
      if (matched) defaultService = matched.id;
    }
    if (!defaultService) {
      const firstSvc = await prisma.service.findFirst();
      defaultService = firstSvc ? firstSvc.id : 1;
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `ZHOU-TK-${Date.now().toString().slice(-4)}-${randNum}`;

    const description = `Eskalasi Tiket Konsultasi Klien:
Kategori: ${extractedCategory}
Urgensi: ${extractedUrgency}
${answered_node ? `Node Terakhir: ${answered_node}\n` : ''}Detail Kebutuhan: ${extractedDesc || '-'}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: clientId,
        service_id: defaultService,
        title,
        description,
        status: 'IN_PROGRESS',
        progress_percent: 15,
        tasks: {
          create: [
            { task_name: 'Intake & Verifikasi Berkas Awal', is_completed: true },
            { task_name: 'Penetapan Konsultan PIC & Divisi Terkait', is_completed: false },
            { task_name: 'Analisis & Pengerjaan Lembar Kerja Fiskal', is_completed: false },
            { task_name: 'Finalisasi & Penyampaian Hasil Konsultasi', is_completed: false },
          ],
        },
      },
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
      },
    });

    if (newProject.client && !newProject.client.company_name) {
      newProject.client.company_name = newProject.client.name || 'Perusahaan Klien';
    }

    // Catat ke append-only audit log
    try {
      await prisma.auditLog.create({
        data: {
          admin_id: 1, // Super Administrator Zhou / Sistem Operasional
          client_id: clientId,
          project_id: newProject.id,
          action: 'CLIENT_CHATBOT_ESCALATION',
          status_before: 'DRAFT',
          status_after: 'IN_PROGRESS',
          description: `Eskalasi tiket konsultasi otomatis via Chatbot: [${newProject.project_code}] ${newProject.title}`,
        },
      });
    } catch (auditErr) {
      console.warn('⚠️ Gagal mencatat audit log chatbot escalation:', (auditErr as Error).message);
    }

    sendSuccess(res, 201, 'Eskalasi chatbot berhasil dibuat menjadi perikatan konsultasi baru', newProject);
  } catch (error) {
    sendError(res, 500, 'Gagal melakukan eskalasi tiket chatbot', (error as Error).message);
  }
};

export const createClientConsultation = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      sendError(res, 401, 'Tidak terotentikasi');
      return;
    }

    const {
      title,
      description,
      category,
      service_id,
      priority,
      urgency,
    } = req.body || {};

    if (!title || !title.trim()) {
      sendError(res, 400, 'Judul permohonan konsultasi wajib diisi');
      return;
    }

    // 1. Resolve Service ID
    let resolvedServiceId = service_id ? Number(service_id) : undefined;
    if (!resolvedServiceId && category) {
      const catLower = category.toLowerCase();
      const matched = await prisma.service.findFirst({
        where: {
          OR: [
            { category: { contains: catLower, mode: 'insensitive' } },
            { service_name: { contains: catLower, mode: 'insensitive' } },
            { service_code: { contains: catLower, mode: 'insensitive' } },
          ],
        },
      });
      if (matched) {
        resolvedServiceId = matched.id;
      }
    }
    if (!resolvedServiceId) {
      const fallbackService = await prisma.service.findFirst();
      resolvedServiceId = fallbackService ? fallbackService.id : 1;
    }

    // 2. Generate unique code
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `ZHOU-CS-${Date.now().toString().slice(-4)}-${randNum}`;

    // 3. Format description with metadata
    const selectedPriority = urgency || priority || 'Normal';
    const cleanDesc = description ? description.trim() : 'Permohonan konsultasi baru dari klien.';
    const formattedDesc = `Kategori: ${category || 'Tax Service Core'}
Urgensi: ${selectedPriority}
${cleanDesc}`;

    // 4. Create Project
    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: clientId,
        service_id: resolvedServiceId,
        title: title.trim(),
        description: formattedDesc,
        status: 'IN_PROGRESS',
        progress_percent: 15,
        tasks: {
          create: [
            { task_name: 'Intake & Verifikasi Berkas Awal', is_completed: true },
            { task_name: 'Penetapan Konsultan PIC & Divisi Terkait', is_completed: false },
            { task_name: 'Analisis & Pengerjaan Lembar Kerja Fiskal', is_completed: false },
            { task_name: 'Finalisasi & Penyampaian Hasil Konsultasi', is_completed: false },
          ],
        },
      },
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
      },
    });

    // 5. Handle optional file upload if uploaded together with creation
    const file = getUploadedFile(req);
    if (file) {
      try {
        const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, 'documents');
        const ext = path.extname(file.originalname).toLowerCase();
        const detected = ext.includes('xls') ? 'XLSX' : ext.includes('doc') ? 'DOCX' : 'PDF';

        const doc = await prisma.projectDocument.create({
          data: {
            project_id: newProject.id,
            file_name: file.originalname,
            file_path: uploadResult.filePath,
            file_size: `${(file.size / 1024).toFixed(1)} KB`,
            file_type: detected,
            uploaded_by: clientId,
          },
        });
        (newProject.documents as any[]).push(doc);
      } catch (uploadErr) {
        console.warn('⚠️ Gagal mengunggah berkas lampiran awal:', (uploadErr as Error).message);
      }
    }

    if (newProject.client && !newProject.client.company_name) {
      newProject.client.company_name = newProject.client.name || 'Perusahaan Klien';
    }

    // Catat ke append-only audit log
    try {
      await prisma.auditLog.create({
        data: {
          admin_id: 1, // Super Administrator Zhou / Sistem Operasional
          client_id: clientId,
          project_id: newProject.id,
          action: 'CLIENT_CONSULTATION_REQUEST',
          status_before: 'DRAFT',
          status_after: 'IN_PROGRESS',
          description: `Permohonan konsultasi baru diajukan oleh klien: [${newProject.project_code}] ${newProject.title}`,
        },
      });
    } catch (auditErr) {
      console.warn('⚠️ Gagal mencatat audit log permohonan konsultasi:', (auditErr as Error).message);
    }

    sendSuccess(res, 201, 'Permohonan konsultasi baru berhasil dibuat dan diteruskan ke sistem operasional', newProject);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat permohonan konsultasi baru', (error as Error).message);
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

