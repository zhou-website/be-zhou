import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { BUCKET_NAME } from '../config/supabase.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendApplicationConfirmationEmail } from '../services/email.service.js';
import { uploadFileToStorage, getSignedDownloadUrl, getPublicStorageUrl, deleteFileFromStorage } from '../services/storage.service.js';
import { getUploadedFile, getUploadedFiles } from '../middlewares/upload.middleware.js';

// Helper upload base64 dataUrl ke Supabase Storage (BE-03)
const uploadBase64ToStorage = async (
  dataUrl: string,
  folder: string,
  prefix: string = 'file'
): Promise<{ filePath: string; publicUrl?: string; signedUrl?: string } | null> => {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = dataUrl.substring(0, commaIdx);
    const rawBase64 = dataUrl.substring(commaIdx + 1).replace(/\s/g, '');
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const buffer = Buffer.from(rawBase64, 'base64');
    let ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').split('+')[0] || 'bin';
    if (mimeType === 'application/pdf') ext = 'pdf';
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    return await uploadFileToStorage(fileName, buffer, mimeType, folder);
  } catch (err) {
    console.warn(`⚠️ Gagal unggah base64 ke storage folder ${folder}:`, (err as Error).message);
    return null;
  }
};

// Helper resolver URL foto sampul edukasi agar selalu menyajikan signed URL aktif dari Supabase
const resolveEducationCoverImage = async (
  imageUrl?: string | null,
  category?: string,
  id?: number
): Promise<string> => {
  if (!imageUrl) {
    return getEducationDefaultCover(category, id || 1);
  }
  const cleanUrl = imageUrl.trim();
  if (
    cleanUrl.startsWith('education/') ||
    cleanUrl.startsWith('documents/') ||
    cleanUrl.includes('supabase.co/storage') ||
    cleanUrl.includes(`/${BUCKET_NAME}/`)
  ) {
    try {
      const signed = await getSignedDownloadUrl(cleanUrl, 86400);
      if (signed) return signed;
    } catch {
      const pub = getPublicStorageUrl(cleanUrl);
      if (pub) return pub;
    }
  }
  return cleanUrl;
};


// --- CMS: Company Profiles & Visi Misi ---
export const getCompanyProfiles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await prisma.companyProfile.findMany();
    sendSuccess(res, 200, 'Berhasil memuat profil perusahaan', profiles);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat profil perusahaan', (error as Error).message);
  }
};

export const updateCompanyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section_key, title, content } = req.body || {};
    const adminId = req.user?.id;

    const profile = await prisma.companyProfile.upsert({
      where: { section_key },
      update: { title, content, updated_by: adminId },
      create: { section_key, title, content, updated_by: adminId },
    });

    sendSuccess(res, 200, 'Profil perusahaan berhasil disimpan', profile);
  } catch (error) {
    sendError(res, 500, 'Gagal menyimpan profil', (error as Error).message);
  }
};

// Helper untuk mendapatkan default card penjelasan & features layanan
const getServiceDefaults = (serviceCode: string, existingName?: string) => {
  switch (serviceCode) {
    case 'TAX_CORE':
      return {
        service_name: 'Tax Service Core & Kesiapan Coretax',
        card_explanation:
          'Pendampingan komprehensif kepatuhan perpajakan korporasi dan transisi kesiapan sistem Coretax DJP. Meliputi penyusunan & pelaporan SPT Masa PPh & PPN, rekonsiliasi fiskal, ekualisasi omzet, validasi faktur, dan SPT Tahunan Badan 1771.',
        features: [
          'Pendampingan Transisi & Kesiapan Coretax DJP',
          'Pelaporan SPT Masa PPh & PPN Tepat Waktu',
          'Rekonsiliasi Fiskal & SPT Tahunan Badan 1771',
          'Mitigasi Risiko Denda & Kepatuhan Regulasi Pajak',
        ],
      };
    case 'ACC_SERV':
      return {
        service_name: existingName || 'Accounting Service',
        card_explanation:
          'Penyusunan laporan keuangan komprehensif berstandar PSAK/SAK Indonesia, mencakup neraca, laba rugi, buku besar, jurnal penyesuaian, serta rekonsiliasi perbankan multi-rekening secara berkala.',
        features: [
          'Laporan Posisi Keuangan (Neraca) & Laba Rugi',
          'Pencatatan Jurnal & Buku Besar Terstandar PSAK',
          'Rekonsiliasi Bank & Manajemen Kas Berkala',
          'Review & Supervisi Akuntansi Korporasi',
        ],
      };
    case 'FIN_CONS':
      return {
        service_name: existingName || 'Business Financial Consulting',
        card_explanation:
          'Konsultasi finansial strategis untuk restrukturisasi keuangan korporasi, evaluasi kelayakan investasi modal, optimalisasi manajemen arus kas operasional, dan perencanaan anggaran bisnis tahunan.',
        features: [
          'Analisis Kesehatan & Kinerja Finansial Korporasi',
          'Perencanaan Anggaran & Optimalisasi Arus Kas',
          'Evaluasi Kelayakan Investasi & Studi Finansial',
          'Restrukturisasi Finansial & Mitigasi Risiko',
        ],
      };
    case 'LEGAL_TAX':
      return {
        service_name: existingName || 'Legal & Tax Dispute Advisory',
        card_explanation:
          'Pendampingan hukum dan advokasi sengketa perpajakan terpercaya. Meliputi pendampingan pemeriksaan KPP, penyusunan tanggapan resmi surat klarifikasi SP2DK, pengajuan surat keberatan pajak, hingga proses banding di Pengadilan Pajak.',
        features: [
          'Pendampingan Pemeriksaan Pajak (Audit Assistance)',
          'Penyusunan Tanggapan Resmi Surat Klarifikasi SP2DK',
          'Pengajuan Permohonan Keberatan Pajak',
          'Advokasi & Banding di Pengadilan Pajak',
        ],
      };
    default:
      return {
        service_name: existingName || 'Layanan Konsultasi Zhou',
        card_explanation:
          'Layanan profesional Zhou Consulting untuk mendukung kepatuhan perpajakan dan kesehatan keuangan korporasi Anda.',
        features: [
          'Konsultasi Profesional Berpengalaman',
          'Penyelesaian Tepat Waktu & Akurat',
          'Kepatuhan Sesuai Regulasi Terbaru',
        ],
      };
  }
};

// --- CMS: Services ---
export const getServices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [services, csSetting] = await Promise.all([
      prisma.service.findMany({
        where: { is_active: true },
        orderBy: { id: 'asc' },
      }),
      prisma.siteSetting.findFirst({
        where: { setting_key: { in: ['cs_whatsapp', 'whatsapp_number'] } },
      }),
    ]);

    const rawWa = csSetting?.setting_value || '+6285121286086';
    let cleanWa = rawWa.replace(/[^0-9]/g, '');
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1);
    }

    const enriched = services.map((s) => {
      const defaults = getServiceDefaults(s.service_code, s.service_name);
      const serviceName = s.service_code === 'TAX_CORE' ? defaults.service_name : s.service_name;
      const cardExplanation = s.card_explanation || defaults.card_explanation;
      let features = defaults.features;
      if (s.features) {
        try {
          features = typeof s.features === 'string' && s.features.startsWith('[') ? JSON.parse(s.features) : s.features;
        } catch {
          features = defaults.features;
        }
      }

      // Sesuai Arahan User & Item #17 Revisi FE:
      // Setiap card ada button konsultasi yang mengarah ke WhatsApp
      const waText = encodeURIComponent(
        `Halo Zhou Consulting, saya ingin berkonsultasi mengenai layanan ${serviceName}. Mohon informasi detail dan persyaratannya.`
      );
      const whatsappUrl = `https://wa.me/${cleanWa}?text=${waText}`;

      return {
        ...s,
        service_name: serviceName,
        card_explanation: cardExplanation,
        features,
        whatsapp_number: rawWa,
        whatsapp_url: whatsappUrl,
        consultation_url: whatsappUrl,
        consultation_button_label: 'Konsultasi via WhatsApp',
        button_action: 'WHATSAPP_CONSULTATION',
      };
    });

    sendSuccess(res, 200, 'Berhasil memuat katalog layanan', enriched);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat katalog layanan', (error as Error).message);
  }
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service_code, service_name, category, description, card_explanation, features } = req.body || {};
    if (!service_name) {
      sendError(res, 400, 'Nama layanan wajib diisi');
      return;
    }

    // Auto-generate service_code jika tidak diisi oleh Superadmin (PM Item #5)
    let finalCode = (service_code || '').trim();
    if (!finalCode) {
      const baseSlug = String(service_name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'service';
      finalCode = `srv-${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newService = await prisma.service.create({
      data: {
        service_code: finalCode,
        service_name,
        category: category || 'Layanan Umum',
        description: description || null,
        card_explanation: card_explanation || null,
        features: features ? (typeof features === 'string' ? features : JSON.stringify(features)) : null,
      },
    });
    sendSuccess(res, 201, 'Layanan baru berhasil ditambahkan', newService);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat layanan', (error as Error).message);
  }
};

// --- CMS: Tax Rates (Kurs Pajak Mingguan) ---
export const getTaxRates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = await redis.get('cache:tax_rates');
    if (cached) {
      sendSuccess(res, 200, 'Kurs pajak mingguan (Cache)', JSON.parse(cached));
      return;
    }

    const rates = await prisma.taxRate.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    await redis.set('cache:tax_rates', JSON.stringify(rates), 'EX', 1800); // 30 menit
    sendSuccess(res, 200, 'Kurs pajak mingguan berhasil dimuat', rates);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat kurs pajak', (error as Error).message);
  }
};

export const createTaxRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currency_code, rate_value, effective_start_date, effective_end_date, kmk_number, change, trend } = req.body || {};

    if (!currency_code || rate_value === undefined || !effective_start_date) {
      sendError(res, 400, 'Kode valas, nilai kurs, dan tanggal efektif wajib diisi');
      return;
    }

    const rate = await prisma.taxRate.create({
      data: {
        currency_code: String(currency_code).toUpperCase(),
        rate_value: Number(rate_value),
        effective_start_date: new Date(effective_start_date),
        effective_end_date: effective_end_date ? new Date(effective_end_date) : null,
        kmk_number: kmk_number || null,
        change: change || null,
        trend: trend || null,
      },
    });

    await redis.del('cache:tax_rates');
    sendSuccess(res, 201, 'Kurs pajak mingguan berhasil ditambahkan', rate);
  } catch (error) {
    sendError(res, 500, 'Gagal menambahkan kurs pajak', (error as Error).message);
  }
};

export const createTaxRatesBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kmk_number, effective_start_date, effective_end_date, rates } = req.body || {};

    if (!Array.isArray(rates) || rates.length === 0) {
      sendError(res, 400, 'Daftar kurs pajak (rates) harus berupa array dan tidak boleh kosong');
      return;
    }

    const startDate = effective_start_date ? new Date(effective_start_date) : new Date();
    const endDate = effective_end_date ? new Date(effective_end_date) : null;
    const kmk = kmk_number ? String(kmk_number).trim() : null;

    const createdItems = [];
    for (const item of rates) {
      const code = item.currency_code || item.code || item.currency;
      const val = item.rate_value !== undefined ? item.rate_value : (item.rate || item.value);
      if (!code || val === undefined) continue;

      const rateNum = Number(String(val).replace(/,/g, ''));
      if (isNaN(rateNum)) continue;

      const created = await prisma.taxRate.create({
        data: {
          currency_code: String(code).toUpperCase(),
          rate_value: rateNum,
          effective_start_date: item.effective_start_date ? new Date(item.effective_start_date) : startDate,
          effective_end_date: item.effective_end_date ? new Date(item.effective_end_date) : endDate,
          kmk_number: item.kmk_number || kmk,
          change: item.change || null,
          trend: item.trend || null,
        },
      });
      createdItems.push(created);
    }

    await redis.del('cache:tax_rates');
    sendSuccess(res, 201, `Berhasil menyimpan ${createdItems.length} data kurs valas KMK mingguan`, createdItems);
  } catch (error) {
    sendError(res, 500, 'Gagal menyimpan kurs pajak batch', (error as Error).message);
  }
};


// --- CMS: Regulations ---
export const getRegulations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.query as { type?: string };
    const whereClause = type ? { regulation_type: type } : {};

    const regs = await prisma.regulation.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    const enrichedRegs = await Promise.all(
      regs.map(async (reg) => {
        let download_url: string | null = null;
        let file_url: string | null = null;
        if (reg.file_path) {
          download_url = await getSignedDownloadUrl(reg.file_path, 3600);
          file_url = getPublicStorageUrl(reg.file_path);
        }
        return {
          ...reg,
          download_url: download_url || file_url,
          file_url: file_url || download_url,
        };
      })
    );

    sendSuccess(res, 200, 'Berhasil memuat daftar regulasi perpajakan', enrichedRegs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat regulasi', (error as Error).message);
  }
};

export const getRegulationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID regulasi tidak valid');
      return;
    }

    const reg = await prisma.regulation.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!reg) {
      sendError(res, 404, 'Dokumen regulasi tidak ditemukan');
      return;
    }

    let download_url: string | null = null;
    let file_url: string | null = null;
    if (reg.file_path) {
      download_url = await getSignedDownloadUrl(reg.file_path, 3600);
      file_url = getPublicStorageUrl(reg.file_path);
    }

    sendSuccess(res, 200, 'Berhasil memuat detail regulasi', {
      ...reg,
      download_url: download_url || file_url,
      file_url: file_url || download_url,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail regulasi', (error as Error).message);
  }
};

export const downloadRegulationFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID regulasi tidak valid');
      return;
    }

    const reg = await prisma.regulation.findUnique({ where: { id } });
    if (!reg || !reg.file_path) {
      sendError(res, 404, 'Berkas dokumen regulasi tidak ditemukan');
      return;
    }

    const downloadUrl = await getSignedDownloadUrl(reg.file_path, 3600);
    sendSuccess(res, 200, 'Tautan unduh regulasi berhasil digenerate', {
      title: reg.title,
      file_path: reg.file_path,
      download_url: downloadUrl,
      public_url: getPublicStorageUrl(reg.file_path),
      expires_in_seconds: 3600,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat tautan unduh regulasi', (error as Error).message);
  }
};

export const createRegulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    let { title, regulation_type, file_path, file_size, legal_status, replacement_ref, doc_number, year } = body;
    const adminId = req.user?.id;
    const file = getUploadedFile(req);

    if (file) {
      file_size = `${(file.size / 1024).toFixed(1)} KB`;
      const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, 'regulations');
      file_path = uploadResult.filePath;
    } else if (file_path && String(file_path).startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(file_path, 'regulations', 'reg');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (body.file_data && String(body.file_data).startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(body.file_data, 'regulations', 'reg');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (!file_path && (body.file_url || body.filePath)) {
      file_path = body.file_url || body.filePath;
    }

    if (!title || !regulation_type || !file_path) {
      sendError(res, 400, 'Judul, tipe regulasi, dan berkas regulasi wajib diisi');
      return;
    }

    const reg = await prisma.regulation.create({
      data: {
        title,
        regulation_type,
        doc_number: doc_number || body.nomor || null,
        year: year ? Number(year) : (body.tahun ? Number(body.tahun) : null),
        file_path,
        file_size: file_size || '0 KB',
        legal_status: legal_status || 'Berlaku',
        replacement_ref: replacement_ref || null,
        uploaded_by: adminId,
      },
    });

    const downloadUrl = await getSignedDownloadUrl(reg.file_path, 3600);
    const publicUrl = getPublicStorageUrl(reg.file_path);

    sendSuccess(res, 201, 'Dokumen regulasi berhasil diunggah ke Supabase Storage', {
      ...reg,
      download_url: downloadUrl,
      public_url: publicUrl,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat regulasi', (error as Error).message);
  }
};


// Helper default cover image untuk konten edukasi (Item Penambahan Foto BE)
const getEducationDefaultCover = (category?: string, id: number = 1): string => {
  const covers = [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', // Tax compliance & audit
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80', // Tax regulations & laws
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // Financial data & accounting
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', // Corporate business advisory
  ];
  return covers[Math.abs(id - 1) % covers.length];
};

// --- CMS: Education & Panduan ---
export const getEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, type } = req.query as { category?: string; type?: string };
    const whereClause: Record<string, string> = {};
    if (category) whereClause.category = category;
    if (type) whereClause.content_type = type.toUpperCase();

    const items = await prisma.educationContent.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let download_url: string | null = null;
        let file_url: string | null = null;
        if (item.file_path) {
          download_url = await getSignedDownloadUrl(item.file_path, 3600);
          file_url = getPublicStorageUrl(item.file_path);
        }
        const finalImage = await resolveEducationCoverImage(item.image_url, item.category, item.id);
        return {
          ...item,
          image_url: finalImage,
          cover_image: finalImage,
          download_url: download_url || file_url,
          file_url: file_url || download_url,
        };
      })
    );

    sendSuccess(res, 200, 'Berhasil memuat materi edukasi pajak', enrichedItems);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat edukasi', (error as Error).message);
  }
};

export const getEducationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID materi edukasi tidak valid');
      return;
    }

    const item = await prisma.educationContent.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!item) {
      sendError(res, 404, 'Materi edukasi tidak ditemukan');
      return;
    }

    let download_url: string | null = null;
    let file_url: string | null = null;
    if (item.file_path) {
      download_url = await getSignedDownloadUrl(item.file_path, 3600);
      file_url = getPublicStorageUrl(item.file_path);
    }

    const finalImage = await resolveEducationCoverImage(item.image_url, item.category, item.id);

    sendSuccess(res, 200, 'Berhasil memuat detail materi edukasi', {
      ...item,
      image_url: finalImage,
      cover_image: finalImage,
      download_url: download_url || file_url,
      file_url: file_url || download_url,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail materi edukasi', (error as Error).message);
  }
};

export const downloadEducationFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID materi edukasi tidak valid');
      return;
    }

    const item = await prisma.educationContent.findUnique({ where: { id } });
    if (!item || !item.file_path) {
      sendError(res, 404, 'Berkas materi edukasi tidak ditemukan');
      return;
    }

    const downloadUrl = await getSignedDownloadUrl(item.file_path, 3600);
    sendSuccess(res, 200, 'Tautan unduh berkas edukasi berhasil dibuat', {
      title: item.title,
      file_path: item.file_path,
      download_url: downloadUrl,
      public_url: getPublicStorageUrl(item.file_path),
      expires_in_seconds: 3600,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat tautan unduh edukasi', (error as Error).message);
  }
};

export const createEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    let { title, category, content_type, body: contentBody, file_path, image_url } = body;
    // Dukung fleksibilitas penamaan body/content/description dari frontend
    if (!contentBody) {
      contentBody = body.content || body.description || body.article_body || '';
    }
    if (!category) {
      category = body.cat || 'Literasi Perpajakan';
    }
    // Periksa seluruh alias properti foto sampul termasuk body.image dari Frontend (BE-03)
    if (!image_url && (body.image || body.photo_url || body.imageUrl || body.cover_image)) {
      image_url = body.image || body.photo_url || body.imageUrl || body.cover_image;
    }

    const adminId = req.user?.id;
    const uploadedFiles = getUploadedFiles(req);

    if (uploadedFiles.length > 0) {
      for (const f of uploadedFiles) {
        const ext = path.extname(f.originalname || '').toLowerCase();
        const isImage = f.mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
        if (isImage) {
          const uploadResult = await uploadFileToStorage(f.originalname, f.buffer, f.mimetype, 'education');
          image_url = uploadResult.filePath;
        } else {
          const uploadResult = await uploadFileToStorage(f.originalname, f.buffer, f.mimetype, 'education');
          file_path = uploadResult.filePath;
        }
      }
    }

    // Tangani base64 image jika Superadmin mengirim via data URL (BE-03)
    if (image_url && typeof image_url === 'string' && image_url.startsWith('data:image/')) {
      const uploadRes = await uploadBase64ToStorage(image_url, 'education', 'edu_cover');
      if (uploadRes) {
        image_url = uploadRes.filePath;
      } else {
        image_url = null;
      }
    }

    // Tangani base64 berkas PDF lampiran edukasi (BE-03)
    const rawFilePayload = body.file_data || body.pdf_base64 || (file_path?.startsWith('data:') ? file_path : null);
    if (rawFilePayload && typeof rawFilePayload === 'string' && rawFilePayload.startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(rawFilePayload, 'education', 'edu_doc');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (!file_path && (body.file_url || body.filePath)) {
      file_path = body.file_url || body.filePath;
    }

    if (!title) {
      sendError(res, 400, 'Judul materi edukasi wajib diisi');
      return;
    }

    const item = await prisma.educationContent.create({
      data: {
        title,
        category,
        content_type: (content_type || (file_path ? 'GUIDE' : 'ARTICLE')).toUpperCase(),
        body: contentBody || '',
        file_path: file_path || null,
        image_url: image_url || getEducationDefaultCover(category, Date.now()),
        created_by: adminId,
      },
    });

    let download_url: string | null = null;
    let file_url: string | null = null;
    if (item.file_path) {
      download_url = await getSignedDownloadUrl(item.file_path, 3600);
      file_url = getPublicStorageUrl(item.file_path);
    }

    const finalImage = await resolveEducationCoverImage(item.image_url, item.category, item.id);

    sendSuccess(res, 201, 'Konten edukasi berhasil dipublikasikan ke Supabase', {
      ...item,
      image_url: finalImage,
      cover_image: finalImage,
      download_url: download_url || file_url,
      file_url: file_url || download_url,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat konten edukasi', (error as Error).message);
  }
};

// --- CMS: Career & Job Applications ---
export const getCareers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.careerJob.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });

    const enrichedJobs = jobs.map((job) => ({
      ...job,
      allowed_file_types: ['PDF', 'DOCX', 'DOC'],
      max_file_size: '5MB',
    }));

    sendSuccess(res, 200, 'Berhasil memuat lowongan karir', enrichedJobs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat lowongan', (error as Error).message);
  }
};

export const getCareerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const job = await prisma.careerJob.findUnique({ where: { id } });

    if (!job) {
      sendError(res, 404, 'Lowongan karir tidak ditemukan');
      return;
    }

    sendSuccess(res, 200, 'Berhasil memuat detail lowongan karir', {
      ...job,
      allowed_file_types: ['PDF', 'DOCX', 'DOC'],
      max_file_size: '5MB',
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail lowongan karir', (error as Error).message);
  }
};

export const createCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { position_code, position_title, level, location, description } = req.body || {};
    const job = await prisma.careerJob.create({
      data: { position_code, position_title, level, location, description },
    });
    sendSuccess(res, 201, 'Lowongan kerja berhasil ditambahkan', {
      ...job,
      allowed_file_types: ['PDF', 'DOCX', 'DOC'],
      max_file_size: '5MB',
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat lowongan karir', (error as Error).message);
  }
};

export const applyCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = parseInt(String(req.params.id), 10);
    if (isNaN(jobId)) {
      sendError(res, 400, 'ID lowongan pekerjaan tidak valid');
      return;
    }

    const job = await prisma.careerJob.findUnique({ where: { id: jobId } });
    if (!job) {
      sendError(res, 404, 'Lowongan pekerjaan tidak ditemukan');
      return;
    }

    const body = req.body || {};
    const applicant_name = body.applicant_name || body.name || body.fullName || body.full_name;
    const applicant_email = body.applicant_email || body.email;
    const applicant_phone = body.applicant_phone || body.phone || body.telephone || body.whatsapp || '';
    const selected_file_type = (body.file_type || body.selected_file_type || '').toUpperCase();
    let cv_file_path = body.cv_file_path || body.file_path || body.cv || body.cv_url || body.file_url || body.resume || body.resume_url;

    // Periksa apakah ada file fisik yang diunggah via multipart/form-data
    const file = getUploadedFile(req);
    let detectedFileType = 'PDF';

    if (file) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (ext === '.docx') detectedFileType = 'DOCX';
      else if (ext === '.doc') detectedFileType = 'DOC';
      else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') detectedFileType = 'IMAGE';
      else detectedFileType = 'PDF';

      // Simpan langsung ke Supabase Storage pada folder 'cvs'
      const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, 'cvs');
      cv_file_path = uploadResult.filePath;
    }

    if (!applicant_name || !applicant_email) {
      sendError(res, 400, 'Nama lengkap dan email pelamar wajib diisi');
      return;
    }

    // Sesuai Validasi Revisi FE (Item #7):
    // Dalam lowongan yang sama, satu alamat email hanya dapat mengirimkan satu lamaran.
    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        job_id: jobId,
        applicant_email: {
          equals: applicant_email,
          mode: 'insensitive',
        },
      },
    });

    if (existingApplication) {
      sendError(
        res,
        400,
        'Alamat email ini sudah pernah mengirimkan lamaran untuk lowongan ini. Setiap lowongan pekerjaan hanya dapat didaftari satu kali per alamat email.'
      );
      return;
    }

    if (!cv_file_path) {
      sendError(
        res,
        400,
        'Berkas CV wajib diunggah. Silakan lampirkan berkas CV (PDF, DOCX, atau DOC maks 10MB) atau sertakan cv_file_path.'
      );
      return;
    }

    const application = await prisma.jobApplication.create({
      data: {
        job_id: jobId,
        applicant_name,
        applicant_email,
        applicant_phone,
        cv_file_path,
      },
    });

    const positionTitle = job.position_title || 'Posisi Zhou Consulting';

    // Buat signed download URL dan public URL untuk verifikasi instan
    const signedCvUrl = await getSignedDownloadUrl(cv_file_path, 3600);
    const publicCvUrl = getPublicStorageUrl(cv_file_path);

    // Kirim konfirmasi via Resend email secara non-blocking
    try {
      await sendApplicationConfirmationEmail(applicant_email, applicant_name, positionTitle);
    } catch (emailErr) {
      console.warn('⚠️ Resend email confirmation skipped/failed:', (emailErr as Error).message);
    }

    sendSuccess(
      res,
      201,
      'Lamaran kerja berhasil dikirimkan dan berkas CV berhasil disimpan ke Supabase Storage',
      {
        ...application,
        position_title: positionTitle,
        file_type: selected_file_type || detectedFileType,
        cv_url: signedCvUrl,
        download_url: signedCvUrl,
        public_url: publicCvUrl,
      }
    );
  } catch (error) {
    sendError(res, 500, 'Gagal mengirimkan lamaran kerja', (error as Error).message);
  }
};

export const getJobApplications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const apps = await prisma.jobApplication.findMany({
      include: {
        job: {
          select: {
            position_code: true,
            position_title: true,
          },
        },
      },
      orderBy: { applied_at: 'desc' },
    });

    // Sertakan signed URL untuk masing-masing CV pelamar agar admin dapat langsung meninjau/unduh berkas
    const appsWithSignedUrls = await Promise.all(
      apps.map(async (app) => ({
        ...app,
        cv_url: await getSignedDownloadUrl(app.cv_file_path, 3600),
        download_url: await getSignedDownloadUrl(app.cv_file_path, 3600),
        public_url: getPublicStorageUrl(app.cv_file_path),
      }))
    );

    sendSuccess(res, 200, 'Berhasil memuat daftar lamaran pelamar', appsWithSignedUrls);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat lamaran', (error as Error).message);
  }
};

export const downloadJobApplicationCv = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID lamaran kerja tidak valid');
      return;
    }

    const app = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: {
          select: { position_code: true, position_title: true },
        },
      },
    });

    if (!app || !app.cv_file_path) {
      sendError(res, 404, 'Berkas CV pelamar tidak ditemukan');
      return;
    }

    const downloadUrl = await getSignedDownloadUrl(app.cv_file_path, 3600);
    sendSuccess(res, 200, 'Signed download URL untuk CV pelamar berhasil digenerate', {
      id: app.id,
      applicant_name: app.applicant_name,
      applicant_email: app.applicant_email,
      position_title: app.job?.position_title,
      cv_file_path: app.cv_file_path,
      download_url: downloadUrl,
      public_url: getPublicStorageUrl(app.cv_file_path),
      expires_in_seconds: 3600,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal membuat tautan unduh CV', (error as Error).message);
  }
};

export const deleteJobApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID lamaran kerja tidak valid');
      return;
    }

    const app = await prisma.jobApplication.findUnique({ where: { id } });
    if (!app) {
      sendError(res, 404, 'Data lamaran pekerjaan tidak ditemukan');
      return;
    }

    if (app.cv_file_path) {
      await deleteFileFromStorage(app.cv_file_path);
    }

    await prisma.jobApplication.delete({ where: { id } });

    sendSuccess(res, 200, 'Data lamaran kerja dan berkas CV berhasil dihapus', { id });
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus data lamaran kerja', (error as Error).message);
  }
};

// Endpoint bantuan publik untuk mengunggah berkas independen (misal CV / formulir publik)
export const uploadPublicFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = getUploadedFile(req);
    if (!file) {
      sendError(res, 400, 'Berkas belum dipilih untuk diunggah. Pastikan menyertakan berkas pada request.');
      return;
    }

    const folder = req.body?.folder || req.query?.folder || 'documents';
    const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, String(folder));
    const signedUrl = await getSignedDownloadUrl(uploadResult.filePath, 3600);
    const publicUrl = getPublicStorageUrl(uploadResult.filePath);

    const ext = path.extname(file.originalname).replace('.', '').toUpperCase();

    sendSuccess(res, 201, 'Berkas berhasil diunggah ke Supabase Storage', {
      file_name: file.originalname,
      file_path: uploadResult.filePath,
      file_size: `${(file.size / 1024).toFixed(1)} KB`,
      file_type: ext || 'PDF',
      public_url: publicUrl,
      download_url: signedUrl,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal mengunggah berkas publik', (error as Error).message);
  }
};


// --- Settings & Contact ---
export const getContactSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.siteSetting.findMany();
    sendSuccess(res, 200, 'Berhasil memuat informasi kontak & pengaturan', settings);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat kontak', (error as Error).message);
  }
};

export const submitContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, message, phone, company, company_name } = req.body || {};
    if (!name || !email || !message) {
      sendError(res, 400, 'Nama, email, dan pesan wajib diisi');
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const clientCompany = company_name || company || 'Perusahaan Klien';

    // Cari atau buat akun klien untuk mencatat histori pesan
    let clientUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!clientUser) {
      clientUser = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: cleanEmail,
          password_hash: 'PUBLIC_INQUIRY_CLIENT',
          role: 'USER',
          phone: phone ? String(phone) : null,
          company_name: clientCompany,
        },
      });
    }

    const defaultService = (await prisma.service.findFirst())?.id || 1;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `ZHOU-INQ-${Date.now().toString().slice(-4)}-${randNum}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: clientUser.id,
        service_id: defaultService,
        title: `Inquiry Pesan Kontak: ${name}`,
        description: `Pesan Konsultasi / Inquiry Masuk dari Web:
Pengirim: ${name} (${cleanEmail})
Telepon: ${phone || '-'}
Perusahaan: ${clientCompany}
Pesan Klien:
${message}`,
        status: 'IN_PROGRESS',
        progress_percent: 15,
        tasks: {
          create: [
            { task_name: 'Penerimaan Inquiry Formulir Kontak', is_completed: true },
            { task_name: 'Penugasan PIC Konsultan / Tindak Lanjut Customer Service', is_completed: false },
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
          },
        },
      },
    });

    sendSuccess(res, 200, 'Pesan pertanyaan Anda telah terkirim dan tercatat di sistem konsultasi Zhou Consulting', {
      received_at: new Date().toISOString(),
      status: 'SENT',
      project_code: code,
      project_id: newProject.id,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal mengirim pesan kontak', (error as Error).message);
  }
};

export const submitPublicConsultation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, company_name, service_id, category, title, description, urgency, priority } = req.body || {};

    if (!name || !email || !title) {
      sendError(res, 400, 'Nama, email, dan kebutuhan permohonan konsultasi wajib diisi');
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const clientCompany = company_name || company || 'Perusahaan Klien';

    let clientUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!clientUser) {
      clientUser = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: cleanEmail,
          password_hash: 'PUBLIC_FORM_CLIENT',
          role: 'USER',
          phone: phone ? String(phone) : null,
          company_name: clientCompany,
        },
      });
    }

    let resolvedServiceId = service_id ? Number(service_id) : undefined;
    if (!resolvedServiceId && category) {
      const catLower = category.toLowerCase();
      const matched = await prisma.service.findFirst({
        where: {
          OR: [
            { category: { contains: catLower, mode: 'insensitive' } },
            { service_name: { contains: catLower, mode: 'insensitive' } },
          ],
        },
      });
      if (matched) resolvedServiceId = matched.id;
    }
    if (!resolvedServiceId) {
      const firstSvc = await prisma.service.findFirst();
      resolvedServiceId = firstSvc ? firstSvc.id : 1;
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `ZHOU-PB-${Date.now().toString().slice(-4)}-${randNum}`;
    const selectedPriority = urgency || priority || 'Normal';

    const fullDescription = `Permohonan Konsultasi Publik:
Pengirim: ${name} (${cleanEmail})
Telepon: ${phone || '-'}
Perusahaan: ${clientCompany}
Kategori: ${category || 'Tax Service Core'}
Urgensi: ${selectedPriority}
Rincian Masalah:
${description || title}`;

    const newProject = await prisma.consultationProject.create({
      data: {
        project_code: code,
        client_id: clientUser.id,
        service_id: resolvedServiceId,
        title: title.trim(),
        description: fullDescription,
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

    // Handle optional file
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
            uploaded_by: clientUser.id,
          },
        });
        (newProject.documents as any[]).push(doc);
      } catch (uploadErr) {
        console.warn('⚠️ Gagal mengunggah berkas permohonan konsultasi publik:', (uploadErr as Error).message);
      }
    }

    sendSuccess(res, 201, 'Permohonan konsultasi berhasil dikirim dan terdaftar di Zhou Consulting', newProject);
  } catch (error) {
    sendError(res, 500, 'Gagal memproses permohonan konsultasi publik', (error as Error).message);
  }
};

// --- Update & Delete: Services ---
export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { service_code, service_name, category, description, is_active, card_explanation, features } = req.body || {};

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(service_code !== undefined && { service_code }),
        ...(service_name !== undefined && { service_name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
        ...(card_explanation !== undefined && { card_explanation }),
        ...(features !== undefined && {
          features: features ? (typeof features === 'string' ? features : JSON.stringify(features)) : null,
        }),
      },
    });

    sendSuccess(res, 200, 'Layanan berhasil diperbarui', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui layanan', (error as Error).message);
  }
};

export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID layanan tidak valid');
      return;
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { consultations_projects: true },
        },
      },
    });

    if (!service) {
      sendError(res, 404, 'Layanan tidak ditemukan');
      return;
    }

    // Jika layanan terkait dengan tiket perikatan/konsultasi klien, terapkan soft-delete (BE-04)
    if (service._count.consultations_projects > 0) {
      await prisma.service.update({
        where: { id },
        data: { is_active: false },
      });
      sendSuccess(res, 200, 'Layanan memiliki riwayat perikatan aktif, status berhasil dinonaktifkan (soft delete)');
      return;
    }

    // Jika tidak ada tiket tertaut, hapus permanen dari basis data
    await prisma.service.delete({ where: { id } });
    sendSuccess(res, 200, 'Layanan berhasil dihapus permanen');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus layanan', (error as Error).message);
  }
};


// --- Update & Delete: Tax Rates ---
export const updateTaxRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { currency_code, rate_value, effective_start_date, effective_end_date } = req.body || {};

    const updated = await prisma.taxRate.update({
      where: { id },
      data: {
        ...(currency_code !== undefined && { currency_code }),
        ...(rate_value !== undefined && { rate_value }),
        ...(effective_start_date !== undefined && { effective_start_date: new Date(effective_start_date) }),
        ...(effective_end_date !== undefined && { effective_end_date: effective_end_date ? new Date(effective_end_date) : null }),
      },
    });

    await redis.del('cache:tax_rates');
    sendSuccess(res, 200, 'Kurs pajak berhasil diperbarui', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui kurs pajak', (error as Error).message);
  }
};

export const deleteTaxRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await prisma.taxRate.delete({ where: { id } });
    await redis.del('cache:tax_rates');
    sendSuccess(res, 200, 'Kurs pajak berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus kurs pajak', (error as Error).message);
  }
};

// --- Update & Delete: Regulations ---
export const updateRegulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const body = req.body || {};
    let { title, regulation_type, file_path, file_size, legal_status, replacement_ref, doc_number, year } = body;
    const file = getUploadedFile(req);

    if (file) {
      file_size = `${(file.size / 1024).toFixed(1)} KB`;
      const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, 'regulations');
      file_path = uploadResult.filePath;
    } else if (file_path && String(file_path).startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(file_path, 'regulations', 'reg');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (body.file_data && String(body.file_data).startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(body.file_data, 'regulations', 'reg');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (!file_path && (body.file_url || body.filePath)) {
      file_path = body.file_url || body.filePath;
    }

    const updated = await prisma.regulation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(regulation_type !== undefined && { regulation_type }),
        ...(doc_number !== undefined && { doc_number }),
        ...(body.nomor !== undefined && { doc_number: body.nomor }),
        ...(year !== undefined && { year: Number(year) }),
        ...(body.tahun !== undefined && { year: Number(body.tahun) }),
        ...(file_path !== undefined && { file_path }),
        ...(file_size !== undefined && { file_size }),
        ...(legal_status !== undefined && { legal_status }),
        ...(replacement_ref !== undefined && { replacement_ref }),
      },
    });

    let download_url: string | null = null;
    let public_url: string | null = null;
    if (updated.file_path) {
      download_url = await getSignedDownloadUrl(updated.file_path, 3600);
      public_url = getPublicStorageUrl(updated.file_path);
    }

    sendSuccess(res, 200, 'Regulasi berhasil diperbarui', {
      ...updated,
      download_url: download_url || public_url,
      public_url: public_url || download_url,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui regulasi', (error as Error).message);
  }
};

export const deleteRegulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await prisma.regulation.delete({ where: { id } });
    sendSuccess(res, 200, 'Regulasi berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus regulasi', (error as Error).message);
  }
};

// --- Update & Delete: Education ---
export const updateEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const body = req.body || {};
    let { title, category, content_type, body: contentBody, file_path, image_url } = body;
    if (!contentBody && (body.content || body.description)) {
      contentBody = body.content || body.description;
    }
    // Periksa seluruh alias properti foto sampul termasuk body.image dari Frontend (BE-03)
    if (!image_url && (body.image || body.photo_url || body.imageUrl || body.cover_image)) {
      image_url = body.image || body.photo_url || body.imageUrl || body.cover_image;
    }

    const uploadedFiles = getUploadedFiles(req);
    if (uploadedFiles.length > 0) {
      for (const f of uploadedFiles) {
        const ext = path.extname(f.originalname || '').toLowerCase();
        const isImage = f.mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
        if (isImage) {
          const uploadResult = await uploadFileToStorage(f.originalname, f.buffer, f.mimetype, 'education');
          image_url = uploadResult.filePath;
        } else {
          const uploadResult = await uploadFileToStorage(f.originalname, f.buffer, f.mimetype, 'education');
          file_path = uploadResult.filePath;
        }
      }
    }

    // Tangani base64 image (BE-03)
    if (image_url && typeof image_url === 'string' && image_url.startsWith('data:image/')) {
      const uploadRes = await uploadBase64ToStorage(image_url, 'education', 'edu_cover');
      if (uploadRes) {
        image_url = uploadRes.filePath;
      } else {
        image_url = undefined; // Jangan override jika upload base64 gagal
      }
    }

    // Tangani base64 PDF lampiran edukasi (BE-03)
    const rawFilePayload = body.file_data || body.pdf_base64 || (file_path?.startsWith('data:') ? file_path : null);
    if (rawFilePayload && typeof rawFilePayload === 'string' && rawFilePayload.startsWith('data:')) {
      const uploadRes = await uploadBase64ToStorage(rawFilePayload, 'education', 'edu_doc');
      if (uploadRes) {
        file_path = uploadRes.filePath;
      }
    } else if (!file_path && (body.file_url || body.filePath)) {
      file_path = body.file_url || body.filePath;
    }

    const updated = await prisma.educationContent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content_type !== undefined && { content_type: content_type.toUpperCase() }),
        ...(contentBody !== undefined && { body: contentBody }),
        ...(file_path !== undefined && { file_path }),
        ...(image_url !== undefined && { image_url }),
      },
    });

    let download_url: string | null = null;
    let file_url: string | null = null;
    if (updated.file_path) {
      download_url = await getSignedDownloadUrl(updated.file_path, 3600);
      file_url = getPublicStorageUrl(updated.file_path);
    }

    const finalImage = await resolveEducationCoverImage(updated.image_url, updated.category, updated.id);

    sendSuccess(res, 200, 'Materi edukasi berhasil diperbarui', {
      ...updated,
      image_url: finalImage,
      cover_image: finalImage,
      download_url: download_url || file_url,
      file_url: file_url || download_url,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui materi edukasi', (error as Error).message);
  }
};

export const deleteEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await prisma.educationContent.delete({ where: { id } });
    sendSuccess(res, 200, 'Materi edukasi berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus materi edukasi', (error as Error).message);
  }
};

// --- Update & Delete: Careers ---
export const updateCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { position_code, position_title, level, location, description, is_active } = req.body || {};

    const updated = await prisma.careerJob.update({
      where: { id },
      data: {
        ...(position_code !== undefined && { position_code }),
        ...(position_title !== undefined && { position_title }),
        ...(level !== undefined && { level }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    sendSuccess(res, 200, 'Lowongan kerja berhasil diperbarui', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui lowongan kerja', (error as Error).message);
  }
};

export const deleteCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID lowongan tidak valid');
      return;
    }

    const job = await prisma.careerJob.findUnique({ where: { id } });
    if (!job) {
      sendError(res, 404, 'Lowongan kerja tidak ditemukan');
      return;
    }

    // Cascade delete data pelamar uji coba pada lowongan ini (BE-04)
    await prisma.jobApplication.deleteMany({
      where: { job_id: id },
    });

    await prisma.careerJob.delete({ where: { id } });
    sendSuccess(res, 200, 'Lowongan kerja beserta berkas pelamar terkait berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus lowongan kerja', (error as Error).message);
  }
};


// --- Chatbot FAQs CRUD (Admin) ---
export const getFaqs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const faqs = await prisma.chatbotFaq.findMany({ orderBy: { id: 'asc' } });
    sendSuccess(res, 200, 'Berhasil memuat daftar FAQ chatbot', faqs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat FAQ', (error as Error).message);
  }
};

export const createFaq = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, question, answer_template } = req.body || {};
    if (!category || !question || !answer_template) {
      sendError(res, 400, 'Kategori, pertanyaan, dan template jawaban wajib diisi');
      return;
    }

    const faq = await prisma.chatbotFaq.create({
      data: { category, question, answer_template },
    });

    await redis.del('cache:chatbot_tree');
    sendSuccess(res, 201, 'FAQ chatbot berhasil ditambahkan', faq);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat FAQ', (error as Error).message);
  }
};

export const updateFaq = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { category, question, answer_template } = req.body || {};

    const updated = await prisma.chatbotFaq.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(question !== undefined && { question }),
        ...(answer_template !== undefined && { answer_template }),
      },
    });

    await redis.del('cache:chatbot_tree');
    sendSuccess(res, 200, 'FAQ chatbot berhasil diperbarui', updated);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui FAQ', (error as Error).message);
  }
};

export const deleteFaq = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await prisma.chatbotFaq.delete({ where: { id } });
    await redis.del('cache:chatbot_tree');
    sendSuccess(res, 200, 'FAQ chatbot berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus FAQ', (error as Error).message);
  }
};

// --- Update Site Settings / Contact ---
export const updateContactSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { whatsapp, email, address, phone, settings } = req.body || {};

    if (Array.isArray(settings)) {
      for (const item of settings) {
        if (item.setting_key && item.setting_value !== undefined) {
          await prisma.siteSetting.upsert({
            where: { setting_key: item.setting_key },
            update: { setting_value: String(item.setting_value) },
            create: { setting_key: item.setting_key, setting_value: String(item.setting_value) },
          });
        }
      }
    } else {
      const entries = Object.entries({ whatsapp, email, address, phone });
      for (const [key, value] of entries) {
        if (value !== undefined) {
          await prisma.siteSetting.upsert({
            where: { setting_key: `contact_${key}` },
            update: { setting_value: String(value) },
            create: { setting_key: `contact_${key}`, setting_value: String(value) },
          });
        }
      }
    }

    const updatedList = await prisma.siteSetting.findMany();
    sendSuccess(res, 200, 'Pengaturan kontak berhasil diperbarui', updatedList);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui pengaturan kontak', (error as Error).message);
  }
};

export const getCareerSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { setting_key: 'career_settings' },
    });

    if (!setting) {
      sendSuccess(res, 200, 'Pengaturan karir default', {
        isOpen: true,
        closedTitle: 'Lowongan Periode Ini Belum Dibuka',
        closedMessage: 'Saat ini seluruh posisi di Zhou Consulting telah terisi dan belum ada lowongan baru yang dibuka untuk publik.',
        closedPeriodNote: 'Jadwal penerimaan periode baru akan diumumkan melalui portal resmi dan akun LinkedIn Zhou Consulting.',
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(setting.setting_value);
    } catch {
      parsedData = {
        isOpen: setting.setting_value === 'true',
        closedMessage: setting.closed_message,
      };
    }

    sendSuccess(res, 200, 'Berhasil memuat pengaturan karir', parsedData);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat pengaturan karir', (error as Error).message);
  }
};

export const updateCareerSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const settingValue = JSON.stringify(body);
    const closedMsg = body.closedMessage || null;

    await prisma.siteSetting.upsert({
      where: { setting_key: 'career_settings' },
      update: {
        setting_value: settingValue,
        closed_message: closedMsg,
      },
      create: {
        setting_key: 'career_settings',
        setting_value: settingValue,
        closed_message: closedMsg,
      },
    });

    sendSuccess(res, 200, 'Pengaturan karir berhasil disimpan di database', body);
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui pengaturan karir', (error as Error).message);
  }
};

// --- Modul Rekrutmen & Pelamar Karir ---
export const updateJobApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body || {};
    if (isNaN(id)) {
      sendError(res, 400, 'ID pelamar kerja tidak valid');
      return;
    }

    if (!status) {
      sendError(res, 400, 'Status seleksi pelamar wajib diisi');
      return;
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status: String(status).trim() },
    });

    sendSuccess(res, 200, 'Status seleksi pelamar kerja berhasil diperbarui', {
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui status lamaran', (error as Error).message);
  }
};

export const applyGeneralCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const applicant_name = body.applicant_name || body.name || body.fullName || body.full_name;
    const applicant_email = body.applicant_email || body.email;
    const applicant_phone = body.applicant_phone || body.phone || body.telephone || body.whatsapp || '';
    const education = body.education || null;
    const linkedin = body.linkedin || null;
    const cover_letter = body.cover_letter || body.coverLetter || null;
    let cv_file_path = body.cv_file_path || body.file_path || body.cv || body.cv_url || body.file_url || body.resume;

    const file = getUploadedFile(req);
    if (file) {
      const uploadResult = await uploadFileToStorage(file.originalname, file.buffer, file.mimetype, 'cvs');
      cv_file_path = uploadResult.filePath;
    }

    if (!applicant_name || !applicant_email) {
      sendError(res, 400, 'Nama lengkap dan email pelamar wajib diisi');
      return;
    }

    if (!cv_file_path) {
      sendError(res, 400, 'Berkas CV wajib diunggah (PDF, DOCX maks 5MB)');
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const registrationCode = body.registration_code || `ZHOU-REC-${new Date().getFullYear()}-${randomSuffix}`;

    const application = await prisma.jobApplication.create({
      data: {
        job_id: null, // General Talent Pool
        applicant_name: String(applicant_name).trim(),
        applicant_email: String(applicant_email).trim().toLowerCase(),
        applicant_phone: String(applicant_phone).trim(),
        education: education ? String(education).trim() : null,
        linkedin: linkedin ? String(linkedin).trim() : null,
        cover_letter: cover_letter ? String(cover_letter).trim() : null,
        registration_code: registrationCode,
        status: 'Review HR',
        cv_file_path,
      },
    });

    sendSuccess(res, 201, 'Lamaran berhasil didaftarkan ke talent pool', {
      registration_code: registrationCode,
      application_id: application.id,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal mendaftarkan lamaran ke talent pool', (error as Error).message);
  }
};

// --- Modul Katalog Detail Layanan Bisnis ---
export const getServiceByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCode = String(req.params.code || '').trim();
    if (!rawCode) {
      sendError(res, 400, 'Kode layanan wajib diisi');
      return;
    }

    const normalizedCode = rawCode.toUpperCase().replace(/-/g, '_');
    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { service_code: { equals: rawCode, mode: 'insensitive' } },
          { service_code: { equals: normalizedCode, mode: 'insensitive' } },
          ...(isNaN(Number(rawCode)) ? [] : [{ id: Number(rawCode) }]),
        ],
      },
    });

    if (!service) {
      sendError(res, 404, 'Detail layanan tidak ditemukan');
      return;
    }

    const defaults = getServiceDefaults(service.service_code, service.service_name);
    let meta: any = {};
    if (service.metadata) {
      meta = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
    }

    let features: any = defaults.features;
    if (service.features) {
      try {
        features = typeof service.features === 'string' && service.features.startsWith('[')
          ? JSON.parse(service.features)
          : service.features;
      } catch {
        features = defaults.features;
      }
    }

    sendSuccess(res, 200, 'Berhasil memuat detail layanan', {
      id: service.id,
      service_code: service.service_code,
      service_name: service.service_name,
      category: service.category,
      description: service.description,
      card_explanation: service.card_explanation || defaults.card_explanation,
      features,
      is_active: service.is_active,
      pillars: meta.pillars || [],
      workflow: meta.workflow || [],
      deliverables: meta.deliverables || [],
      scopes: meta.scopes || [],
      faqs: meta.faqs || [],
      wa_template: meta.wa_template || '',
      updated_at: service.updated_at,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat detail layanan', (error as Error).message);
  }
};

export const updateServiceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID layanan tidak valid');
      return;
    }

    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      sendError(res, 404, 'Layanan tidak ditemukan');
      return;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        metadata: req.body,
      },
    });

    sendSuccess(res, 200, 'Detail struktural layanan berhasil diperbarui', {
      id: updated.id,
      service_code: updated.service_code,
      updated_at: updated.updated_at,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui detail layanan', (error as Error).message);
  }
};

export const toggleServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { is_active } = req.body || {};
    if (isNaN(id)) {
      sendError(res, 400, 'ID layanan tidak valid');
      return;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: { is_active: Boolean(is_active) },
    });

    sendSuccess(res, 200, 'Status publikasi layanan berhasil diperbarui', {
      id: updated.id,
      is_active: updated.is_active,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui status layanan', (error as Error).message);
  }
};

// --- Modul Belajar Pajak & Tautan Portal Resmi DJP ---
export const getLearningLinks = async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.all === 'true';
    const where = showAll ? {} : { is_active: true };
    const links = await prisma.learningLink.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });
    sendSuccess(res, 200, 'Berhasil memuat tautan modul belajar pajak', links);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat tautan belajar', (error as Error).message);
  }
};

export const createLearningLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, url, category, description, is_active } = req.body || {};
    if (!title || !url || !category) {
      sendError(res, 400, 'Judul, tautan URL, dan kategori wajib diisi');
      return;
    }

    const item = await prisma.learningLink.create({
      data: {
        title: String(title).trim(),
        url: String(url).trim(),
        category: String(category).trim(),
        description: description ? String(description).trim() : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    sendSuccess(res, 201, 'Tautan portal belajar berhasil ditambahkan', {
      id: item.id,
      title: item.title,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal menambahkan tautan belajar', (error as Error).message);
  }
};

export const updateLearningLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID tautan belajar tidak valid');
      return;
    }

    const { title, url, category, description, is_active } = req.body || {};
    const updated = await prisma.learningLink.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(url !== undefined && { url: String(url).trim() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(description !== undefined && { description: String(description).trim() }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      },
    });

    sendSuccess(res, 200, 'Tautan portal belajar berhasil diperbarui', {
      id: updated.id,
      updated: true,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui tautan belajar', (error as Error).message);
  }
};

export const deleteLearningLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      sendError(res, 400, 'ID tautan belajar tidak valid');
      return;
    }

    await prisma.learningLink.delete({ where: { id } });
    sendSuccess(res, 200, 'Tautan portal berhasil dihapus');
  } catch (error) {
    sendError(res, 500, 'Gagal menghapus tautan belajar', (error as Error).message);
  }
};

// --- Modul Kurs Pajak KMK Mingguan (Batch Update & Full Sync) ---
export const batchUpdateTaxRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kmk_number, period_start, period_end, effective_start_date, effective_end_date, rates } = req.body || {};

    if (!rates || !Array.isArray(rates) || rates.length === 0) {
      sendError(res, 400, 'Daftar kurs valas (rates) harus berupa array dan tidak boleh kosong');
      return;
    }

    const kmk = (kmk_number || `KMK Nomor 48/MK/EF.2/${new Date().getFullYear()}`).trim();
    const startDate = (period_start || effective_start_date) ? new Date(period_start || effective_start_date) : new Date();
    const endDate = (period_end || effective_end_date) ? new Date(period_end || effective_end_date) : new Date(startDate.getTime() + 7 * 86400000);


    // Simpan seluruh kurs KMK secara serentak
    await prisma.$transaction(
      rates.map((r: any) =>
        prisma.taxRate.create({
          data: {
            currency_code: String(r.currency_code).toUpperCase(),
            rate_value: Number(r.rate_value),
            effective_start_date: startDate,
            effective_end_date: endDate,
            kmk_number: String(kmk_number).trim(),
            change: r.change ? String(r.change) : null,
            trend: r.trend ? String(r.trend) : null,
          },
        })
      )
    );

    try {
      await redis.del('cache:tax_rates');
    } catch {
      // Redis optional / offline in dev
    }

    sendSuccess(res, 201, 'Seluruh kurs KMK pekan berjalan berhasil disimpan secara serentak', {
      inserted_count: rates.length,
      kmk_number,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal melakukan batch update kurs KMK', (error as Error).message);
  }
};

export const getCurrentKmkTaxRates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestRateWithKmk = await prisma.taxRate.findFirst({
      where: { kmk_number: { not: null } },
      orderBy: { created_at: 'desc' },
    });

    let kmkNumber = latestRateWithKmk?.kmk_number || 'KMK Nomor 48/MK/EF.2/2026';
    let rates = await prisma.taxRate.findMany({
      where: { kmk_number: kmkNumber },
      orderBy: { currency_code: 'asc' },
    });

    if (rates.length === 0) {
      rates = await prisma.taxRate.findMany({
        orderBy: { created_at: 'desc' },
        take: 25,
      });
    }

    const firstRate = rates[0];
    let periodStr = 'Pekan Berjalan';
    if (firstRate?.effective_start_date) {
      const startStr = firstRate.effective_start_date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const endStr = firstRate.effective_end_date
        ? firstRate.effective_end_date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '';
      periodStr = endStr ? `${startStr} - ${endStr}` : startStr;
    }

    const formattedRates = rates.map((r) => ({
      id: r.id,
      currency_code: r.currency_code,
      rate_value: Number(r.rate_value),
      change: r.change || '+0.00',
      trend: r.trend || 'neutral',
      effective_start_date: r.effective_start_date,
      effective_end_date: r.effective_end_date,
    }));

    sendSuccess(res, 200, 'Data kurs pajak KMK terupdate berhasil dimuat', {
      kmk_number: kmkNumber,
      period: periodStr,
      rates: formattedRates,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memuat data kurs pajak KMK terkini', (error as Error).message);
  }
};

// --- Modul Toggle Status Publikasi CMS ---
export const toggleRegulationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { is_active } = req.body || {};
    if (isNaN(id)) {
      sendError(res, 400, 'ID regulasi tidak valid');
      return;
    }

    const updated = await prisma.regulation.update({
      where: { id },
      data: { is_active: Boolean(is_active) },
    });

    sendSuccess(res, 200, 'Status tayang regulasi berhasil diperbarui', {
      id: updated.id,
      is_active: updated.is_active,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui status regulasi', (error as Error).message);
  }
};

export const toggleEducationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { is_active } = req.body || {};
    if (isNaN(id)) {
      sendError(res, 400, 'ID artikel edukasi tidak valid');
      return;
    }

    const updated = await prisma.educationContent.update({
      where: { id },
      data: { is_active: Boolean(is_active) },
    });

    sendSuccess(res, 200, 'Status tayang artikel edukasi berhasil diperbarui', {
      id: updated.id,
      is_active: updated.is_active,
    });
  } catch (error) {
    sendError(res, 500, 'Gagal memperbarui status artikel edukasi', (error as Error).message);
  }
};


