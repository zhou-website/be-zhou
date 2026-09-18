import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';

async function main() {
  console.log('🌱 Starting database seeding for Zhou Consulting...');

  // 1. Seed Users (Superadmin, Admin, User/Client)
  const superadminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const clientPassword = await bcrypt.hash('Client123!', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@zhouconsulting.com' },
    update: {
      password: superadminPassword,
      role: 'SUPERADMIN',
      is_active: true,
    },
    create: {
      name: 'Super Administrator Zhou',
      email: 'superadmin@zhouconsulting.com',
      password: superadminPassword,
      role: 'SUPERADMIN',
      phone: '+6281234567890',
      company_name: 'Zhou Consulting Group',
      is_active: true,
    },
  });
  console.log(`✅ Superadmin seeded: ${superadmin.email} (ID: ${superadmin.id})`);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zhouconsulting.com' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
      is_active: true,
    },
    create: {
      name: 'Konsultan Senior Zhou',
      email: 'admin@zhouconsulting.com',
      password: adminPassword,
      role: 'ADMIN',
      phone: '+6281234567891',
      company_name: 'Zhou Consulting Group',
      is_active: true,
    },
  });
  console.log(`✅ Admin seeded: ${admin.email} (ID: ${admin.id})`);

  const client = await prisma.user.upsert({
    where: { email: 'klien@perusahaan.com' },
    update: {
      password: clientPassword,
      role: 'USER',
      is_active: true,
    },
    create: {
      name: 'Budi Pratama (Direktur)',
      email: 'klien@perusahaan.com',
      password: clientPassword,
      role: 'USER',
      phone: '+6281234567892',
      company_name: 'PT Maju Sukses Berdikari',
      is_active: true,
    },
  });
  console.log(`✅ Client seeded: ${client.email} (ID: ${client.id})`);

  // 2. Seed Services (4 Core Services PRD)
  const services = [
    {
      service_code: 'TAX_CORE',
      service_name: 'Tax Service Core',
      category: 'Perpajakan',
      description: 'Layanan kepatuhan dan pelaporan SPT Masa & Tahunan Badan/Pribadi secara komprehensif.',
      is_active: true,
    },
    {
      service_code: 'ACC_SERV',
      service_name: 'Accounting Service',
      category: 'Akuntansi',
      description: 'Penyusunan laporan keuangan neraca, laba rugi, buku besar, dan rekonsiliasi pembukuan profesional.',
      is_active: true,
    },
    {
      service_code: 'FIN_CONS',
      service_name: 'Business Financial Consulting',
      category: 'Konsultasi Finansial',
      description: 'Analisis strategi finansial, evaluasi kelayakan investasi, dan optimasi arus kas perusahaan.',
      is_active: true,
    },
    {
      service_code: 'LEGAL_TAX',
      service_name: 'Legal & Tax Dispute Advisory',
      category: 'Legalitas & Sengketa',
      description: 'Pendampingan pemeriksaan pajak, klarifikasi SP2DK, pengajuan keberatan, dan mitigasi risiko regulasi.',
      is_active: true,
    },
  ];

  for (const s of services) {
    const service = await prisma.service.upsert({
      where: { service_code: s.service_code },
      update: {
        service_name: s.service_name,
        category: s.category,
        description: s.description,
        is_active: s.is_active,
      },
      create: s,
    });
    console.log(`✅ Service seeded: ${service.service_name} (${service.service_code})`);
  }

  // 3. Seed Site Settings
  const settings = [
    { setting_key: 'company_name', setting_value: 'Zhou Consulting' },
    { setting_key: 'company_email', setting_value: 'contact@zhouconsulting.com' },
    { setting_key: 'company_phone', setting_value: '+62 21 555 8899' },
    { setting_key: 'company_address', setting_value: 'Sudirman Central Business District (SCBD) Lot 28, Jakarta Selatan' },
    { setting_key: 'cs_whatsapp', setting_value: '+6281298765432' },
  ];

  for (const item of settings) {
    await prisma.siteSetting.upsert({
      where: { setting_key: item.setting_key },
      update: { setting_value: item.setting_value },
      create: item,
    });
  }
  console.log(`✅ Site Settings seeded (${settings.length} items)`);

  // 4. Seed Company Profile
  const profiles = [
    {
      section_key: 'about_hero',
      title: 'Tentang Zhou Consulting',
      content: 'Zhou Consulting adalah kantor konsultan pajak dan akuntansi terkemuka yang berdedikasi mendampingi korporasi di Indonesia dalam mencapai kepatuhan pajak optimal dan tata kelola keuangan yang transparan.',
      updated_by: superadmin.id,
    },
    {
      section_key: 'vision_mission',
      title: 'Visi & Misi Perusahaan',
      content: 'Visi: Menjadi mitra strategis perpajakan dan finansial paling terpercaya di Asia Tenggara. Misi: Memberikan solusi kepatuhan tepat sasaran, akurat, dan berintegritas tinggi.',
      updated_by: superadmin.id,
    },
  ];

  for (const prof of profiles) {
    await prisma.companyProfile.upsert({
      where: { section_key: prof.section_key },
      update: { title: prof.title, content: prof.content, updated_by: prof.updated_by },
      create: prof,
    });
  }
  console.log(`✅ Company Profile seeded`);

  // 5. Seed Chatbot FAQs
  const existingFaqs = await prisma.chatbotFaq.count();
  if (existingFaqs === 0) {
    await prisma.chatbotFaq.createMany({
      data: [
        {
          category: 'LAYANAN',
          question: 'Layanan apa saja yang disediakan Zhou Consulting?',
          answer_template: 'Kami menyediakan Tax Service Core, Accounting Service, Business Financial Consulting, dan Legal & Tax Dispute Advisory.',
        },
        {
          category: 'KONSULTASI',
          question: 'Bagaimana cara memulai konsultasi perpajakan?',
          answer_template: 'Anda dapat mendaftarkan akun korporasi di website ini, lalu membuka tiket konsultasi baru melalui menu Dashboard Klien.',
        },
        {
          category: 'SP2DK',
          question: 'Perusahaan saya menerima surat SP2DK dari KPP, apa yang harus dilakukan?',
          answer_template: 'Jangan panik. Segera buka tiket konsultasi di Zhou Consulting dan unggah dokumen SP2DK Anda. Tim konsultan kami akan meninjau data fiskal Anda dan menyusun tanggapan resmi.',
        },
      ],
    });
    console.log(`✅ Chatbot FAQs seeded (3 questions)`);
  }

  // 6. Seed Career Jobs
  const jobs = [
    {
      position_code: 'JOB-TAX-SR-01',
      position_title: 'Senior Tax Consultant',
      level: 'Senior Associate',
      location: 'Jakarta (Hybrid)',
      description: 'Mencari konsultan pajak berpengalaman minimal 3 tahun dengan sertifikasi Brevet AB/C untuk menangani klien korporasi multinasional.',
      is_active: true,
    },
    {
      position_code: 'JOB-ACC-JR-01',
      position_title: 'Junior Accounting Staff',
      level: 'Entry Level',
      location: 'Jakarta (On-site)',
      description: 'Lulusan S1 Akuntansi dengan pemahaman siklus akuntansi komprehensif, teliti, dan menguasai software akuntansi.',
      is_active: true,
    },
  ];

  for (const job of jobs) {
    await prisma.careerJob.upsert({
      where: { position_code: job.position_code },
      update: {
        position_title: job.position_title,
        level: job.level,
        location: job.location,
        description: job.description,
        is_active: job.is_active,
      },
      create: job,
    });
  }
  console.log(`✅ Career Jobs seeded (${jobs.length} positions)`);

  // 7. Seed Sample Consultation Project for Client
  const taxService = await prisma.service.findUnique({ where: { service_code: 'TAX_CORE' } });
  if (taxService) {
    const existingProject = await prisma.consultationProject.findUnique({
      where: { project_code: 'PRJ-TAX-2026-001' },
    });

    if (!existingProject) {
      const project = await prisma.consultationProject.create({
        data: {
          project_code: 'PRJ-TAX-2026-001',
          client_id: client.id,
          service_id: taxService.id,
          title: 'SPT Tahunan Badan PT Maju Sukses Berdikari 2025',
          description: 'Penyusunan rekonsiliasi fiskal dan pelaporan SPT Tahunan Badan 1771 tahun pajak 2025.',
          status: 'IN_PROGRESS',
          progress_percent: 35,
          tasks: {
            create: [
              { task_name: 'Pengumpulan laporan keuangan internal & rekening koran', is_completed: true },
              { task_name: 'Ekualisasi PPh Badan dengan SPT Masa PPN & PPh 21/23', is_completed: true },
              { task_name: 'Penyusunan Kertas Kerja Rekonsiliasi Fiskal', is_completed: false },
              { task_name: 'Drafting Formulir 1771 & Lampiran', is_completed: false },
              { task_name: 'Final Review bersama Klien & Pelaporan DJP Online', is_completed: false },
            ],
          },
        },
      });
      console.log(`✅ Sample Project seeded: ${project.title} (${project.project_code}) with 5 tasks`);
    }
  }

  console.log('✨ All seed data created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
