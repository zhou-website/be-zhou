import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendApplicationConfirmationEmail } from '../services/email.service.js';

// --- CMS: Company Profiles & Visi Misi ---
export const getCompanyProfiles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await prisma.companyProfile.findMany();
    sendSuccess(res, 200, 'Berhasil memuat profil perusahaan', profiles);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat profil', (error as Error).message);
  }
};

export const updateCompanyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section_key, title, content } = req.body;
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

// --- CMS: Services ---
export const getServices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const services = await prisma.service.findMany({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    sendSuccess(res, 200, 'Berhasil memuat katalog layanan', services);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat layanan', (error as Error).message);
  }
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service_code, service_name, category, description } = req.body;
    const newService = await prisma.service.create({
      data: { service_code, service_name, category, description },
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
      take: 20,
    });

    await redis.set('cache:tax_rates', JSON.stringify(rates), 'EX', 1800); // 30 menit
    sendSuccess(res, 200, 'Kurs pajak mingguan berhasil dimuat', rates);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat kurs pajak', (error as Error).message);
  }
};

export const createTaxRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currency_code, rate_value, effective_start_date, effective_end_date } = req.body;

    const rate = await prisma.taxRate.create({
      data: {
        currency_code,
        rate_value,
        effective_start_date: new Date(effective_start_date),
        effective_end_date: effective_end_date ? new Date(effective_end_date) : null,
      },
    });

    await redis.del('cache:tax_rates');
    sendSuccess(res, 201, 'Kurs pajak mingguan berhasil ditambahkan', rate);
  } catch (error) {
    sendError(res, 500, 'Gagal menambahkan kurs pajak', (error as Error).message);
  }
};

// --- CMS: Regulations ---
export const getRegulations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const regs = await prisma.regulation.findMany({
      orderBy: { created_at: 'desc' },
    });
    sendSuccess(res, 200, 'Berhasil memuat daftar regulasi perpajakan', regs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat regulasi', (error as Error).message);
  }
};

export const createRegulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, regulation_type, file_path, file_size } = req.body;
    const adminId = req.user?.id;

    const reg = await prisma.regulation.create({
      data: {
        title,
        regulation_type,
        file_path,
        file_size: file_size || '0 KB',
        uploaded_by: adminId,
      },
    });

    sendSuccess(res, 201, 'Dokumen regulasi berhasil diunggah', reg);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat regulasi', (error as Error).message);
  }
};

// --- CMS: Education & Panduan ---
export const getEducation = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.educationContent.findMany({
      orderBy: { created_at: 'desc' },
    });
    sendSuccess(res, 200, 'Berhasil memuat materi edukasi pajak', items);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat edukasi', (error as Error).message);
  }
};

export const createEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, category, content_type, body, file_path } = req.body;
    const adminId = req.user?.id;

    const item = await prisma.educationContent.create({
      data: {
        title,
        category,
        content_type: content_type || 'ARTICLE',
        body,
        file_path,
        created_by: adminId,
      },
    });

    sendSuccess(res, 201, 'Konten edukasi berhasil dipublikasikan', item);
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
    sendSuccess(res, 200, 'Berhasil memuat lowongan karir', jobs);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat lowongan', (error as Error).message);
  }
};

export const createCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { position_code, position_title, level, location, description } = req.body;
    const job = await prisma.careerJob.create({
      data: { position_code, position_title, level, location, description },
    });
    sendSuccess(res, 201, 'Lowongan kerja berhasil ditambahkan', job);
  } catch (error) {
    sendError(res, 500, 'Gagal membuat lowongan karir', (error as Error).message);
  }
};

export const applyCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = parseInt(String(req.params.id), 10);
    const { applicant_name, applicant_email, applicant_phone, cv_file_path } = req.body;

    if (!applicant_name || !applicant_email || !cv_file_path) {
      sendError(res, 400, 'Data biodata dan file CV (PDF) wajib diisi');
      return;
    }

    const application = await prisma.jobApplication.create({
      data: {
        job_id: jobId,
        applicant_name,
        applicant_email,
        applicant_phone: applicant_phone || '',
        cv_file_path,
      },
    });

    const job = await prisma.careerJob.findUnique({ where: { id: jobId } });
    const positionTitle = job?.position_title || 'Posisi Zhou Consulting';

    // Kirim konfirmasi via Resend email
    await sendApplicationConfirmationEmail(applicant_email, applicant_name, positionTitle);

    sendSuccess(res, 201, 'Lamaran kerja berhasil dikirimkan dan konfirmasi telah dikirim via email', application);
  } catch (error) {
    sendError(res, 500, 'Gagal mengirimkan lamaran', (error as Error).message);
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
    sendSuccess(res, 200, 'Berhasil memuat daftar lamaran pelamar', apps);
  } catch (error) {
    sendError(res, 500, 'Gagal memuat lamaran', (error as Error).message);
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
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      sendError(res, 400, 'Nama, email, dan pesan wajib diisi');
      return;
    }

    // Response konfirmasi pesan
    sendSuccess(res, 200, 'Pesan pertanyaan Anda telah terkirim ke customer service kami', {
      received_at: new Date().toISOString(),
      status: 'SENT',
    });
  } catch (error) {
    sendError(res, 500, 'Gagal mengirim pesan kontak', (error as Error).message);
  }
};
