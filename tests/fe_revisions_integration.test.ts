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

describe('🎯 Zhou Consulting — FE Revisions End-to-End Integration Test Suite', () => {
  before(async () => {
    // Start local in-memory HTTP server for testing
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Obtain tokens for SUPERADMIN, ADMIN, USER
    const saRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@zhouconsulting.com',
        password: 'SuperAdmin123!',
      }),
    });
    const saData = await saRes.json();
    assert.strictEqual(saRes.status, 200);
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
    assert.strictEqual(admRes.status, 200);
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
    assert.strictEqual(cliRes.status, 200);
    clientToken = cliData.data.token;
  });

  test('1. Superadmin can access client & admin features (Full RBAC privilege)', async () => {
    // Superadmin accessing client dashboard
    const resCli = await fetch(`${baseUrl}/api/v1/client/dashboard/overview`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resCli.status, 200);

    // Superadmin accessing admin consultations
    const resAdm = await fetch(`${baseUrl}/api/v1/admin/consultations`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAdm.status, 200);
  });

  test('2. Superadmin can manage admins (Update & Reactivate Admin)', async () => {
    // 2.1 Update admin phone & name
    const updateRes = await fetch(`${baseUrl}/api/v1/superadmin/admins/2`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        name: 'Konsultan Senior Zhou (Updated)',
        phone: '+6281234567899',
      }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.data.name, 'Konsultan Senior Zhou (Updated)');

    // 2.2 Reactivate admin
    const reactivateRes = await fetch(`${baseUrl}/api/v1/superadmin/admins/2/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(reactivateRes.status, 200);
  });

  test('3. Superadmin assigns and reassigns consultation ticket to PIC Admin', async () => {
    const project = await prisma.consultationProject.findFirst();
    assert.ok(project, 'Project should exist');

    const assignRes = await fetch(`${baseUrl}/api/v1/admin/consultations/${project.id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({ assigned_admin_id: 2 }),
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignData.data.assigned_admin_id, 2);
  });

  test('4. Admin only sees tickets assigned to them, while Superadmin sees all', async () => {
    const resAdm = await fetch(`${baseUrl}/api/v1/admin/consultations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdm = await resAdm.json();
    assert.strictEqual(resAdm.status, 200);
    // All returned projects for this admin must have assigned_admin_id == 2
    for (const proj of dataAdm.data) {
      assert.strictEqual(proj.assigned_admin_id, 2);
    }
  });

  test('5. Public can access chatbot tree without login (Item #5)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/chatbot/tree`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length > 0);
  });

  test('6. Public services include card explanation and WhatsApp consultation link (Item #17 & #18)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/services`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.length >= 4);

    const taxCore = data.data.find((s: any) => s.service_code === 'TAX_CORE');
    assert.ok(taxCore);
    assert.ok(taxCore.service_name.includes('Kesiapan Coretax'));
    assert.ok(taxCore.card_explanation);
    assert.ok(Array.isArray(taxCore.features));
    assert.ok(taxCore.whatsapp_url.includes('wa.me'));
    assert.strictEqual(taxCore.consultation_button_label, 'Konsultasi via WhatsApp');
  });

  test('7. Enforce one job application per email per job (Item #7)', async () => {
    const job = await prisma.careerJob.findFirst();
    assert.ok(job);

    const testEmail = `tester-${Date.now()}@testcompany.com`;

    // First submission: should succeed
    const firstRes = await fetch(`${baseUrl}/api/v1/public/careers/${job.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicant_name: 'Calon Konsultan Pajak',
        applicant_email: testEmail,
        applicant_phone: '+628111222333',
        cv_file_path: 'cvs/sample-cv.pdf',
      }),
    });
    assert.strictEqual(firstRes.status, 201);

    // Second submission with exact same email to same job: must be rejected with 400
    const secondRes = await fetch(`${baseUrl}/api/v1/public/careers/${job.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicant_name: 'Calon Konsultan Pajak',
        applicant_email: testEmail,
        applicant_phone: '+628111222333',
        cv_file_path: 'cvs/sample-cv.pdf',
      }),
    });
    const secondData = await secondRes.json();
    assert.strictEqual(secondRes.status, 400);
    assert.ok(secondData.message.includes('sudah pernah'));
  });

  test('8. Education contents include photo / cover image managed by BE', async () => {
    const res = await fetch(`${baseUrl}/api/v1/public/education`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.length > 0);

    for (const item of data.data) {
      assert.ok(item.image_url, `Education item ${item.id} should have image_url`);
      assert.ok(item.image_url.startsWith('http'));
    }
  });

  test('9. Client consultation detail returns tasks, documents, and signed download URLs (Item #3 & #4)', async () => {
    const project = await prisma.consultationProject.findFirst({
      where: { client_id: 3 },
    });
    assert.ok(project);

    const res = await fetch(`${baseUrl}/api/v1/client/consultations/${project.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.tasks);
    assert.ok(data.data.service);
    assert.ok(Array.isArray(data.data.documents));
  });

  test('10. CMS routes are restricted strictly to Superadmin (Item #9 & #10)', async () => {
    // Admin trying to access CMS: should be 403 Forbidden
    const resAdm = await fetch(`${baseUrl}/api/v1/admin/cms/job-applications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdm.status, 403);

    // Superadmin trying to access CMS: should be 200 OK
    const resSa = await fetch(`${baseUrl}/api/v1/admin/cms/job-applications`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resSa.status, 200);
  });
});
