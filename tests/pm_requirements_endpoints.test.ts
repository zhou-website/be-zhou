import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import http from 'http';

let server: http.Server;
let baseUrl = '';
let superadminToken = '';
let adminToken = '';
let clientToken = '';
let clientId = 3;
let testProjectId = 0;

describe('🎯 Zhou Consulting — PM & Frontend Integration Requirements Test Suite', () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Obtain JWT tokens for all roles
    const saRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@zhouconsulting.com',
        password: 'SuperAdmin123!',
      }),
    });
    const saData = await saRes.json();
    assert.strictEqual(saRes.status, 200, 'Superadmin login failed');
    superadminToken = saData.data.token;

    const admRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zhouconsulting.com',
        password: 'Admin123!',
      }),
    });
    const admData = await admRes.json();
    assert.strictEqual(admRes.status, 200, 'Admin login failed');
    adminToken = admData.data.token;

    const cliRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'klien@perusahaan.com',
        password: 'Client123!',
      }),
    });
    const cliData = await cliRes.json();
    assert.strictEqual(cliRes.status, 200, 'Client login failed');
    clientToken = cliData.data.token;
    clientId = cliData.data.user.id;

    // Create a dedicated consultation project for testing ticket flow
    const proj = await prisma.consultationProject.create({
      data: {
        project_code: `TK-TEST-${Date.now().toString().slice(-6)}`,
        client_id: clientId,
        service_id: 1,
        title: 'Pengujian Integrasi Tiket dan Korespondensi Klien-Konsultan',
        description: 'Deskripsi asli permohonan konsultasi dari klien PT Maju Berdikari.',
        status: 'IN_PROGRESS',
        progress_percent: 25,
      },
    });
    testProjectId = proj.id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // 1. Modul Korespondensi, Catatan Konsultan & Pengelolaan Tiket (Endpoints #1 - #6)
  // =========================================================================
  test('#1 POST /api/v1/client/consultations/:id/messages (Client sends chat/question)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/client/consultations/${testProjectId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        message: 'Halo konsultan, berkas laporan keuangan tahun 2025 sudah saya siapkan.',
      }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.project_id, testProjectId);
    assert.strictEqual(json.data.sender_role, 'USER');
    assert.strictEqual(json.data.message, 'Halo konsultan, berkas laporan keuangan tahun 2025 sudah saya siapkan.');
  });

  test('#2 POST /api/v1/admin/consultations/:id/messages (Admin/Consultant adds official review note)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/consultations/${testProjectId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        message: 'Catatan telaah staf: Mohon lampirkan juga mutasi rekening koran bulan November-Desember.',
      }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.project_id, testProjectId);
    assert.strictEqual(json.data.sender_role, 'ADMIN');
  });

  test('#3 GET /api/v1/consultations/:id/messages (Shared chat history for User/Admin/Superadmin)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/consultations/${testProjectId}/messages?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2, 'Should contain at least the 2 messages sent above');
    assert.ok(json.data[0].sender_name);
  });

  test('#5 PATCH /api/v1/client/consultations/:id/archive (Client archives completed ticket)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/client/consultations/${testProjectId}/archive`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ is_archived: true }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.is_archived, true);
  });

  test('#6 PUT /api/v1/admin/consultations/:id/milestones (Admin updates ticket workflow milestones)', async () => {
    const milestones = [
      { step: '01', title: 'Intake & Verifikasi Berkas', status: 'completed', date: '20 Okt 2026', description: 'Lengkap' },
      { step: '02', title: 'Ekualisasi & Rekonsiliasi Fiskal', status: 'in_progress', date: '21 Okt 2026', description: 'Sedang dikerjakan' },
      { step: '03', title: 'Finalisasi & Pelaporan SPT', status: 'pending', date: '23 Okt 2026', description: 'Menunggu draft final' },
    ];
    const res = await fetch(`${baseUrl}/api/v1/admin/consultations/${testProjectId}/milestones`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ milestones }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.project_id, testProjectId);
    assert.strictEqual(json.data.milestones.length, 3);
  });

  test('Bug Fix #5: Admin updating consultation with notes does NOT overwrite client description', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/consultations/${testProjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        progress_percent: 60,
        notes: 'Catatan internal staf konsultan mengenai bukti potong PPh 23.',
      }),
    });
    assert.strictEqual(res.status, 200);

    const project = await prisma.consultationProject.findUnique({ where: { id: testProjectId } });
    assert.ok(project);
    assert.strictEqual(project.progress_percent, 60);
    // Client description must NOT be overwritten!
    assert.strictEqual(project.description, 'Deskripsi asli permohonan konsultasi dari klien PT Maju Berdikari.');

    // The note must be recorded in consultation_messages
    const msg = await prisma.consultationMessage.findFirst({
      where: { project_id: testProjectId, message: 'Catatan internal staf konsultan mengenai bukti potong PPh 23.' },
    });
    assert.ok(msg, 'Consultant note should be persisted as a consultation message');
  });

  test('#4 DELETE /api/v1/client/consultations/:id (Client cancels/deletes consultation ticket)', async () => {
    // Create a temporary project to delete
    const tempProj = await prisma.consultationProject.create({
      data: {
        project_code: `TK-DEL-${Date.now().toString().slice(-6)}`,
        client_id: clientId,
        service_id: 1,
        title: 'Tiket Permohonan Untuk Dibatalkan Klien',
        status: 'IN_PROGRESS',
      },
    });

    const res = await fetch(`${baseUrl}/api/v1/client/consultations/${tempProj.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Permohonan konsultasi berhasil dibatalkan');

    const check = await prisma.consultationProject.findUnique({ where: { id: tempProj.id } });
    assert.strictEqual(check, null);
  });

  // =========================================================================
  // 3. Modul Rekrutmen & Pelamar Karir (Endpoints #12 & #13)
  // =========================================================================
  test('#13 POST /api/v1/public/careers/general/apply (General Talent Pool registration)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/careers/general/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicant_name: 'Dinda Permata Putri, S.E.',
        applicant_email: 'dinda.permata@example.com',
        applicant_phone: '+6281234567888',
        education: 'S1 Akuntansi Universitas Indonesia',
        linkedin: 'https://linkedin.com/in/dindapermata',
        cover_letter: 'Saya sangat tertarik bergabung di tim perpajakan Zhou Consulting.',
        cv_file_path: 'cvs/dinda_permata_cv.pdf',
      }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.registration_code);
    assert.ok(json.data.registration_code.startsWith('ZHOU-REC-'));

    // Check DB record
    const appRecord = await prisma.jobApplication.findFirst({
      where: { applicant_email: 'dinda.permata@example.com' },
    });
    assert.ok(appRecord);
    assert.strictEqual(appRecord.job_id, null, 'General talent pool should have job_id null');
    assert.strictEqual(appRecord.status, 'Review HR');
    assert.strictEqual(appRecord.education, 'S1 Akuntansi Universitas Indonesia');
  });

  test('#12 PATCH /api/v1/admin/cms/job-applications/:id/status (Superadmin updates applicant selection status)', async () => {
    const appRecord = await prisma.jobApplication.findFirst({
      where: { applicant_email: 'dinda.permata@example.com' },
    });
    assert.ok(appRecord);

    const res = await fetch(`${baseUrl}/api/v1/admin/cms/job-applications/${appRecord.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({ status: 'Interview' }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'Interview');

    // Clean up
    await prisma.jobApplication.delete({ where: { id: appRecord.id } });
  });

  // =========================================================================
  // 4. Modul Katalog Detail Layanan Bisnis (Endpoints #14 & #15)
  // =========================================================================
  test('#15 PUT /api/v1/admin/cms/services/:id/details (Superadmin updates deep structural metadata)', async () => {
    const service = await prisma.service.findFirst({ where: { is_active: true } });
    assert.ok(service);

    const payload = {
      pillars: ['Pilar 1: Kepatuhan & Mitigasi Risiko', 'Pilar 2: Optimalisasi Beban Pajak Legal'],
      workflow: [
        { step: 1, title: 'Analisis Pendahuluan', desc: 'Telaah dokumen dan profil SPT' },
        { step: 2, title: 'Kalkulasi & Rekonsiliasi', desc: 'Penyusunan kertas kerja komprehensif' },
      ],
      deliverables: ['Laporan Rekonsiliasi Fiskal PDF', 'Kertas Kerja Perhitungan XLSX'],
      faqs: [{ question: 'Berapa lama prosesnya?', answer: '3-5 hari kerja' }],
      wa_template: 'Halo Zhou Consulting, saya tertarik dengan layanan ini.',
    };

    const res = await fetch(`${baseUrl}/api/v1/admin/cms/services/${service.id}/details`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
  });

  test('#14 GET /api/v1/public/services/:code (Public retrieves service details with unpacked metadata)', async () => {
    const service = await prisma.service.findFirst({ where: { is_active: true } });
    assert.ok(service);

    const res = await fetch(`${baseUrl}/api/v1/public/services/${service.service_code}`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.service_code, service.service_code);
    assert.ok(Array.isArray(json.data.pillars));
    assert.ok(Array.isArray(json.data.workflow));
  });

  // =========================================================================
  // 5. Modul Belajar Pajak & Tautan Portal Resmi DJP (Endpoints #16 - #19)
  // =========================================================================
  let testLinkId = 0;

  test('#17 POST /api/v1/admin/cms/learning-links (Superadmin creates new official DJP link)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/cms/learning-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        title: 'Portal Coretax DJP Online',
        url: 'https://coretax.pajak.go.id',
        category: 'Layanan Utama Perpajakan',
        description: 'Gerbang utama akses sistem administrasi perpajakan terpadu DJP.',
        is_active: true,
      }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.id);
    testLinkId = json.data.id;
  });

  test('#16 GET /api/v1/public/learning-links (Public reads learning portal links)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/learning-links`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((l: any) => l.id === testLinkId);
    assert.ok(found);
    assert.strictEqual(found.title, 'Portal Coretax DJP Online');
  });

  test('#18 PUT /api/v1/admin/cms/learning-links/:id (Superadmin updates learning link)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/cms/learning-links/${testLinkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        title: 'Portal Coretax DJP Online (Resmi)',
      }),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.updated, true);
  });

  test('#19 DELETE /api/v1/admin/cms/learning-links/:id (Superadmin deletes learning link)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/cms/learning-links/${testLinkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Tautan portal berhasil dihapus');

    const check = await prisma.learningLink.findUnique({ where: { id: testLinkId } });
    assert.strictEqual(check, null);
  });

  // =========================================================================
  // 6. Modul Kurs Pajak KMK Mingguan (Endpoints #20 & #21)
  // =========================================================================
  test('#20 POST /api/v1/admin/cms/tax-rates/batch (Superadmin batch upserts weekly KMK rates)', async () => {
    const batchPayload = {
      kmk_number: 'KMK Nomor 48/MK/EF.2/2026',
      period_start: '2026-10-07',
      period_end: '2026-10-13',
      rates: [
        { currency_code: 'USD', rate_value: 17935, change: '+72.00', trend: 'up' },
        { currency_code: 'EUR', rate_value: 19520, change: '-15.00', trend: 'down' },
        { currency_code: 'SGD', rate_value: 13450, change: '+12.50', trend: 'up' },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/admin/cms/tax-rates/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify(batchPayload),
    });
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.inserted_count, 3);
    assert.strictEqual(json.data.kmk_number, 'KMK Nomor 48/MK/EF.2/2026');
  });

  test('#21 GET /api/v1/public/tax-rates/current-kmk (Public views current weekly KMK with trends)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/tax-rates/current-kmk`);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.kmk_number);
    assert.ok(json.data.period);
    assert.ok(Array.isArray(json.data.rates));
    assert.ok(json.data.rates.length > 0);
    assert.ok(json.data.rates[0].currency_code);
    assert.ok(json.data.rates[0].rate_value);
  });

  // =========================================================================
  // 7. Modul Toggle Status Publikasi CMS (Endpoints #22 - #24)
  // =========================================================================
  test('#22 PATCH /api/v1/admin/cms/regulations/:id/status (Superadmin toggles regulation publication)', async () => {
    const reg = await prisma.regulation.findFirst();
    if (reg) {
      const res = await fetch(`${baseUrl}/api/v1/admin/cms/regulations/${reg.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({ is_active: false }),
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.is_active, false);

      // Revert back
      await prisma.regulation.update({ where: { id: reg.id }, data: { is_active: true } });
    }
  });

  test('#23 PATCH /api/v1/admin/cms/education/:id/status (Superadmin toggles education publication)', async () => {
    const edu = await prisma.educationContent.findFirst();
    if (edu) {
      const res = await fetch(`${baseUrl}/api/v1/admin/cms/education/${edu.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({ is_active: false }),
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.is_active, false);

      // Revert back
      await prisma.educationContent.update({ where: { id: edu.id }, data: { is_active: true } });
    }
  });

  test('#24 PATCH /api/v1/admin/cms/services/:id/status (Superadmin toggles service publication)', async () => {
    const srv = await prisma.service.findFirst();
    if (srv) {
      const res = await fetch(`${baseUrl}/api/v1/admin/cms/services/${srv.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({ is_active: true }),
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.is_active, true);
    }
  });
});
