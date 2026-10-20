import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';

let server: http.Server;
let baseUrl = '';
let adminToken = '';

describe('🚀 File Upload & Supabase Storage Integration Tests', () => {
  before(async () => {
    // Start server on an ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // Obtain admin token for CMS upload endpoints
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zhouconsulting.com',
        password: 'Admin123!',
      }),
    });
    const json = await res.json();
    assert.equal(res.status, 200);
    adminToken = json.data.token;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    try {
      const { prisma, pool } = await import('../src/config/database.js');
      await prisma.$disconnect();
      await pool.end();
    } catch {}
    try {
      const { redis } = await import('../src/config/redis.js');
      redis.disconnect();
    } catch {}
  });

  test('1. Helper Upload: POST /api/v1/upload with Multipart File to Supabase', async () => {
    const formData = new FormData();
    const testFile = new Blob(['Test dummy document for Zhou Consulting'], { type: 'application/pdf' });
    formData.append('file', testFile, 'kontrak_perikatan_test.pdf');
    formData.append('folder', 'documents');

    const res = await fetch(`${baseUrl}/api/v1/upload`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.file_path.includes('documents/'));
    assert.ok(json.data.download_url.includes('supabase.co') || json.data.download_url.includes('zhou-documents'));
    assert.ok(json.data.public_url.includes('supabase.co') || json.data.public_url.includes('zhou-documents'));
  });

  test('2. Career Job Apply: POST /api/v1/careers/:id/apply with CV upload', async () => {
    // Ambil list lowongan aktif untuk mendapatkan job ID yang valid
    const jobListRes = await fetch(`${baseUrl}/api/v1/careers`);
    const jobListJson = await jobListRes.json();
    assert.ok(jobListJson.data && jobListJson.data.length > 0, 'Harus ada lowongan karir aktif');
    const targetJobId = jobListJson.data[0].id;

    const formData = new FormData();
    formData.append('applicant_name', 'Budi Santoso');
    formData.append('applicant_email', `budi.${Date.now()}@gmail.com`);
    formData.append('applicant_phone', '+6281234567890');
    // Test custom field name "cv"
    const cvFile = new Blob(['%PDF-1.4 Mock CV Content for Consultant Application'], { type: 'application/pdf' });
    formData.append('cv', cvFile, 'Curriculum_Vitae_Budi.pdf');

    const res = await fetch(`${baseUrl}/api/v1/careers/${targetJobId}/apply`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.cv_file_path.includes('cvs/'));
    assert.ok(json.data.cv_url.includes('supabase.co') || json.data.cv_url.includes('zhou-documents'));
    assert.ok(json.data.download_url.includes('supabase.co') || json.data.download_url.includes('zhou-documents'));
  });

  test('3. Education CMS: POST /api/v1/admin/cms/education with file attachment to Supabase', async () => {
    const formData = new FormData();
    formData.append('title', `Panduan SPT Masa PPh 21 Otomatis ${Date.now()}`);
    formData.append('category', 'PPh 21');
    formData.append('content_type', 'GUIDE');
    formData.append('content', 'Langkah-langkah pelaporan SPT Masa PPh 21 menggunakan aplikasi e-Bupot.');
    
    // Test custom field name "document"
    const guideFile = new Blob(['Mock PDF Guide attachment content'], { type: 'application/pdf' });
    formData.append('document', guideFile, 'Panduan_eBupot_21.pdf');

    const res = await fetch(`${baseUrl}/api/v1/admin/cms/education`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.file_path.includes('education/'));
    assert.ok(json.data.download_url.includes('supabase.co') || json.data.download_url.includes('zhou-documents'));
    assert.ok(json.data.file_url.includes('supabase.co') || json.data.file_url.includes('zhou-documents'));
  });

  test('4. Education Public: GET /api/v1/education includes download_url and file_url', async () => {
    const res = await fetch(`${baseUrl}/api/v1/education`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    
    const itemWithFile = json.data.find((item: any) => item.file_path);
    if (itemWithFile) {
      assert.ok(itemWithFile.download_url, 'Item should have download_url');
      assert.ok(itemWithFile.file_url, 'Item should have file_url');
    }
  });

  test('5. Education Public: GET /api/v1/education/:id and /download work correctly', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/education`);
    const listJson = await listRes.json();
    const targetItem = listJson.data[0];
    assert.ok(targetItem, 'Target education item should exist');

    // Detail endpoint
    const detailRes = await fetch(`${baseUrl}/api/v1/education/${targetItem.id}`);
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.equal(detailJson.data.id, targetItem.id);

    // If has file, test download endpoint
    if (targetItem.file_path) {
      const dlRes = await fetch(`${baseUrl}/api/v1/education/${targetItem.id}/download`);
      assert.equal(dlRes.status, 200);
      const dlJson = await dlRes.json();
      assert.ok(dlJson.data.download_url.includes('supabase.co') || dlJson.data.download_url.includes('zhou-documents'));
    }
  });

  test('6. Regulation CMS: POST /api/v1/admin/cms/regulations with PDF file upload', async () => {
    const formData = new FormData();
    formData.append('title', `Peraturan Direktur Jenderal Pajak PER-${Date.now().toString().slice(-4)}`);
    formData.append('regulation_type', 'PERDIRJEN');
    
    // Test custom field name "file"
    const regFile = new Blob(['Mock Regulation PDF content'], { type: 'application/pdf' });
    formData.append('file', regFile, 'PER_01_PJ_2026.pdf');

    const res = await fetch(`${baseUrl}/api/v1/admin/cms/regulations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.file_path.includes('regulations/'));
    assert.ok(json.data.download_url.includes('supabase.co') || json.data.download_url.includes('zhou-documents'));
  });

  test('7. Job Applications: GET /api/v1/admin/cms/job-applications includes signed CV URLs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/cms/job-applications`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    
    if (json.data.length > 0) {
      const app = json.data[0];
      assert.ok(app.cv_url, 'Job application must have cv_url');
      assert.ok(app.cv_url.includes('supabase.co') || app.cv_url.includes('zhou-documents'));

      // Test download endpoint for this application
      const dlRes = await fetch(`${baseUrl}/api/v1/admin/cms/job-applications/${app.id}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(dlRes.status, 200);
      const dlJson = await dlRes.json();
      assert.ok(dlJson.data.download_url.includes('supabase.co') || dlJson.data.download_url.includes('zhou-documents'));
    }
  });
});
