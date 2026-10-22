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

  // 2. Seed Services (4 Core Services PRD & Revisi FE Coretax)
  const services = [
    {
      service_code: 'TAX_CORE',
      service_name: 'Tax Service Core & Kesiapan Coretax',
      category: 'Perpajakan',
      description: 'Layanan kepatuhan dan pelaporan SPT Masa & Tahunan Badan/Pribadi serta pendampingan transisi Coretax DJP.',
      card_explanation:
        'Pendampingan komprehensif kepatuhan perpajakan korporasi dan transisi kesiapan sistem Coretax DJP. Meliputi penyusunan & pelaporan SPT Masa PPh & PPN, rekonsiliasi fiskal, ekualisasi omzet, validasi faktur, dan SPT Tahunan Badan 1771.',
      features: JSON.stringify([
        'Pendampingan Transisi & Kesiapan Coretax DJP',
        'Pelaporan SPT Masa PPh & PPN Tepat Waktu',
        'Rekonsiliasi Fiskal & SPT Tahunan Badan 1771',
        'Mitigasi Risiko Denda & Kepatuhan Regulasi Pajak',
      ]),
      is_active: true,
    },
    {
      service_code: 'ACC_SERV',
      service_name: 'Accounting Service',
      category: 'Akuntansi',
      description: 'Penyusunan laporan keuangan neraca, laba rugi, buku besar, dan rekonsiliasi pembukuan profesional.',
      card_explanation:
        'Penyusunan laporan keuangan komprehensif berstandar PSAK/SAK Indonesia, mencakup neraca, laba rugi, buku besar, jurnal penyesuaian, serta rekonsiliasi perbankan multi-rekening secara berkala.',
      features: JSON.stringify([
        'Laporan Posisi Keuangan (Neraca) & Laba Rugi',
        'Pencatatan Jurnal & Buku Besar Terstandar PSAK',
        'Rekonsiliasi Bank & Manajemen Kas Berkala',
        'Review & Supervisi Akuntansi Korporasi',
      ]),
      is_active: true,
    },
    {
      service_code: 'FIN_CONS',
      service_name: 'Business Financial Consulting',
      category: 'Konsultasi Finansial',
      description: 'Analisis strategi finansial, evaluasi kelayakan investasi, dan optimasi arus kas perusahaan.',
      card_explanation:
        'Konsultasi finansial strategis untuk restrukturisasi keuangan korporasi, evaluasi kelayakan investasi modal, optimalisasi manajemen arus kas operasional, dan perencanaan anggaran bisnis tahunan.',
      features: JSON.stringify([
        'Analisis Kesehatan & Kinerja Finansial Korporasi',
        'Perencanaan Anggaran & Optimalisasi Arus Kas',
        'Evaluasi Kelayakan Investasi & Studi Finansial',
        'Restrukturisasi Finansial & Mitigasi Risiko',
      ]),
      is_active: true,
    },
    {
      service_code: 'LEGAL_TAX',
      service_name: 'Legal & Tax Dispute Advisory',
      category: 'Legalitas & Sengketa',
      description: 'Pendampingan pemeriksaan pajak, klarifikasi SP2DK, pengajuan keberatan, dan mitigasi risiko regulasi.',
      card_explanation:
        'Pendampingan hukum dan advokasi sengketa perpajakan terpercaya. Meliputi pendampingan pemeriksaan KPP, penyusunan tanggapan resmi surat klarifikasi SP2DK, pengajuan surat keberatan pajak, hingga proses banding di Pengadilan Pajak.',
      features: JSON.stringify([
        'Pendampingan Pemeriksaan Pajak (Audit Assistance)',
        'Penyusunan Tanggapan Resmi Surat Klarifikasi SP2DK',
        'Pengajuan Permohonan Keberatan Pajak',
        'Advokasi & Banding di Pengadilan Pajak',
      ]),
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
        card_explanation: s.card_explanation,
        features: s.features,
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
    { setting_key: 'cs_whatsapp', setting_value: '+6285121286086' },
    { setting_key: 'whatsapp_number', setting_value: '+6285121286086' },
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

  // 6. Seed Career Jobs (Dikosongkan sesuai arahan PM Post-Deploy BE-05 agar tidak mengotori landing page)
  console.log(`ℹ️ Career Jobs seed dilewati (Menunggu lowongan resmi dipublikasikan oleh Superadmin via CMS)`);


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
          assigned_admin_id: admin.id,
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
      console.log(`✅ Sample Project seeded: ${project.title} (${project.project_code}) with 5 tasks & assigned to Admin PIC`);
    } else {
      await prisma.consultationProject.update({
        where: { id: existingProject.id },
        data: { assigned_admin_id: admin.id },
      });
      console.log(`✅ Sample Project updated: assigned to Admin PIC ${admin.email}`);
    }
  }

  // 8. Seed Education Contents (Konten Edukasi dengan Foto & Panduan)
  const existingEducation = await prisma.educationContent.count();
  if (existingEducation === 0) {
    const educations = [
      {
        title: 'Panduan Lengkap Kesiapan Transisi Coretax DJP 2026 untuk Korporasi',
        category: 'Kesiapan Coretax',
        content_type: 'GUIDE',
        body: 'Direktorat Jenderal Pajak (DJP) mengimplementasikan sistem inti perpajakan terpadu (Coretax). Pelajari langkah strategis integrasi data SPT dan kesiapan kepatuhan bisnis Anda.',
        image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        created_by: superadmin.id,
      },
      {
        title: 'Strategi Manajemen Pembukuan & Rekonsiliasi Fiskal Akhir Tahun',
        category: 'Akuntansi & Pajak',
        content_type: 'ARTICLE',
        body: 'Rekonsiliasi fiskal memegang peran krusial dalam menyelaraskan laba akuntansi komersial dengan ketentuan peraturan perpajakan yang berlaku di Indonesia.',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        created_by: admin.id,
      },
      {
        title: 'Mitigasi Risiko Pemeriksaan Pajak & Tata Cara Klarifikasi SP2DK',
        category: 'Legalitas & Sengketa',
        content_type: 'ARTICLE',
        body: 'Langkah taktis dan format tanggapan formal saat perusahaan Anda menerima Surat Permintaan Penjelasan atas Data dan/atau Keterangan (SP2DK) dari Kantor Pelayanan Pajak.',
        image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
        created_by: superadmin.id,
      },
    ];

    for (const edu of educations) {
      await prisma.educationContent.create({ data: edu });
    }
    console.log(`✅ Education Contents seeded (${educations.length} items with photos)`);
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
