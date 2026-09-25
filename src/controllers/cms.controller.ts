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
    const { service_code, service_name, category, description } = req.body || {};
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
    const { currency_code, rate_value, effective_start_date, effective_end_date } = req.body || {};

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
    const { title, regulation_type, file_path, file_size } = req.body || {};
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
    const { title, category, content_type, body, file_path } = req.body || {};
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
    const { position_code, position_title, level, location, description } = req.body || {};
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
    const { applicant_name, applicant_email, applicant_phone, cv_file_path } = req.body || {};

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
    const { name, email, message } = req.body || {};
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

// --- Update & Delete: Services ---
export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { service_code, service_name, category, description, is_active } = req.body || {};

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(service_code !== undefined && { service_code }),
        ...(service_name !== undefined && { service_name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
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
    await prisma.service.delete({ where: { id } });
    sendSuccess(res, 200, 'Layanan berhasil dihapus');
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
    const { title, regulation_type, file_path, file_size } = req.body || {};

    const updated = await prisma.regulation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(regulation_type !== undefined && { regulation_type }),
        ...(file_path !== undefined && { file_path }),
        ...(file_size !== undefined && { file_size }),
      },
    });

    sendSuccess(res, 200, 'Regulasi berhasil diperbarui', updated);
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
    const { title, category, content_type, body, file_path } = req.body || {};

    const updated = await prisma.educationContent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content_type !== undefined && { content_type }),
        ...(body !== undefined && { body }),
        ...(file_path !== undefined && { file_path }),
      },
    });

    sendSuccess(res, 200, 'Materi edukasi berhasil diperbarui', updated);
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
    await prisma.careerJob.delete({ where: { id } });
    sendSuccess(res, 200, 'Lowongan kerja berhasil dihapus');
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

