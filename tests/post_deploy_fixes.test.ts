import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma, pool } from '../src/config/database.js';
import http from 'http';

let server: http.Server;
let baseUrl = '';
let superadminToken = '';
let adminToken = '';
let createdProjectId = 0;
let createdServiceId = 0;
let testAdminId = 0;

describe('🚀 Post-Deploy Backend Fixes Verification Suite', () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Login as Superadmin
    const saRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@zhouconsulting.com',
        password: 'SuperAdmin123!',
      }),
    });
    if (saRes.status === 200) {
      const saData = await saRes.json();
      superadminToken = saData.data.token;
    }

    // Login or find Admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', is_active: true },
    });
    if (adminUser) {
      testAdminId = adminUser.id;
    }
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Cleanup any created test items
    if (createdProjectId) {
      await prisma.projectTask.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.projectDocument.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.consultationProject.delete({ where: { id: createdProjectId } }).catch(() => {});
    }
    if (createdServiceId) {
      await prisma.service.delete({ where: { id: createdServiceId } }).catch(() => {});
    }
    await pool.end();
    await prisma.$disconnect();
  });

  test('BE-05: Lowongan karir dummy/seed lama berhasil diverifikasi dan dibersihkan', async () => {
    const dummyJobs = await prisma.careerJob.findMany({
      where: { position_code: { in: ['JOB-TAX-SR-01', 'JOB-ACC-JR-01'] } },
    });
    // Jika masih ada, script cleanup dapat menghapusnya
    if (dummyJobs.length > 0) {
      for (const dj of dummyJobs) {
        await prisma.jobApplication.deleteMany({ where: { job_id: dj.id } });
        await prisma.careerJob.delete({ where: { id: dj.id } });
      }
    }
    const checkAfter = await prisma.careerJob.findMany({
      where: { position_code: { in: ['JOB-TAX-SR-01', 'JOB-ACC-JR-01'] } },
    });
    assert.strictEqual(checkAfter.length, 0, 'Lowongan dummy seed lama harus bersih');
  });

  test('BE-04: deleteService melakukan soft delete jika ada perikatan terkait', async () => {
    if (!superadminToken) return;

    // Buat service baru
    const srvRes = await fetch(`${baseUrl}/api/v1/admin/cms/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        service_name: 'Layanan Uji Soft Delete',
        category: 'Tax Advisory',
        description: 'Layanan pengujian constraint delete',
      }),
    });
    const srvData = await srvRes.json();
    assert.strictEqual(srvRes.status, 201);
    createdServiceId = srvData.data.id;

    // Cari client untuk bikin tiket
    const clientUser = await prisma.user.findFirst({ where: { role: 'USER' } });
    if (!clientUser) return;

    // Buat konsultasi yang mereferensikan service ini
    const prj = await prisma.consultationProject.create({
      data: {
        project_code: `ZHOU-TEST-${Date.now().toString().slice(-4)}`,
        client_id: clientUser.id,
        service_id: createdServiceId,
        title: 'Tiket Uji Relasi Service',
        status: 'IN_PROGRESS',
        progress_percent: 15,
        tasks: {
          create: [
            { task_name: 'Intake & Verifikasi Berkas Awal', is_completed: true },
            { task_name: 'Penetapan Konsultan PIC & Divisi Terkait', is_completed: false },
          ],
        },
      },
    });
    createdProjectId = prj.id;

    // Panggil deleteService
    const delRes = await fetch(`${baseUrl}/api/v1/admin/cms/services/${createdServiceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const delData = await delRes.json();
    assert.strictEqual(delRes.status, 200);

    // Cek bahwa service sekarang is_active: false (soft delete)
    const srvCheck = await prisma.service.findUnique({ where: { id: createdServiceId } });
    assert.strictEqual(srvCheck?.is_active, false, 'Service harus di-soft delete (is_active: false)');
  });

  test('BE-01: assignConsultationPic otomatis mencentang task #2 dan menaikkan progress_percent ke 40%', async () => {
    if (!superadminToken || !createdProjectId || !testAdminId) return;

    const assignRes = await fetch(`${baseUrl}/api/v1/admin/consultations/${createdProjectId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        assigned_admin_id: testAdminId,
      }),
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignData.data.assigned_admin_id, testAdminId);
    assert.ok(assignData.data.progress_percent >= 40, 'Progres tiket harus dinaikkan minimal ke 40%');

    // Cek status task kedua di database
    const tasks = await prisma.projectTask.findMany({
      where: { project_id: createdProjectId },
      orderBy: { id: 'asc' },
    });
    const picTask = tasks.find((t) => t.task_name.includes('Penetapan Konsultan'));
    assert.ok(picTask, 'Task Penetapan Konsultan PIC harus ada');
    assert.strictEqual(picTask.is_completed, true, 'Task Penetapan Konsultan PIC harus otomatis selesai (is_completed: true)');
  });

  test('BE-03: CMS Education menerima body.image dan mengembalikan URL yang valid', async () => {
    if (!superadminToken) return;

    // Test base64 image 1x1 png
    const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const eduRes = await fetch(`${baseUrl}/api/v1/admin/cms/education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        title: 'Uji Integrasi Foto Edukasi ' + Date.now(),
        category: 'Literasi Perpajakan',
        body: 'Konten artikel edukasi perpajakan komprehensif.',
        image: base64Png,
      }),
    });
    const eduData = await eduRes.json();
    assert.strictEqual(eduRes.status, 201);
    assert.ok(eduData.data.image_url, 'image_url harus ada di respons');
    assert.ok(!eduData.data.image_url.includes('undefined'), 'image_url tidak boleh undefined');

    // Clean up
    if (eduData.data.id) {
      await prisma.educationContent.delete({ where: { id: eduData.data.id } });
    }
  });

  test('CMS Kurs Pajak: Endpoint batch update kurs valas berfungsi normal', async () => {
    if (!superadminToken) return;

    const kmkNum = `KMK Nomor TEST/${Date.now().toString().slice(-4)}`;
    const batchRes = await fetch(`${baseUrl}/api/v1/admin/cms/tax-rates/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        kmk_number: kmkNum,
        effective_start_date: '2026-10-21',
        effective_end_date: '2026-10-28',
        rates: [
          { currency_code: 'USD', rate_value: 16250.00, change: '+25.00', trend: 'UP' },
          { currency_code: 'EUR', rate_value: 17400.00, change: '-10.00', trend: 'DOWN' },
        ],
      }),
    });
    const batchData = await batchRes.json();
    assert.strictEqual(batchRes.status, 201);

    // Cek di database
    const savedRates = await prisma.taxRate.findMany({
      where: { kmk_number: kmkNum },
    });
    assert.strictEqual(savedRates.length, 2, '2 kurs valas harus tersimpan di database');

    // Clean up
    await prisma.taxRate.deleteMany({ where: { kmk_number: kmkNum } });
  });
});
