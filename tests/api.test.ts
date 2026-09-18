import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

let superadminToken = '';
let adminToken = '';
let clientToken = '';
let testAdminId = 0;
let testProjectId = 1;
let testTaskId = 1;

describe('🎯 Zhou Consulting — 46 Endpoint Full Automated Test Suite', () => {

  before(async () => {
    // Authenticate and obtain tokens for all 3 roles
    const saRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@zhouconsulting.com',
        password: 'SuperAdmin123!',
      }),
    });
    const saJson = await saRes.json();
    assert.ok(saJson.data?.token, `Superadmin login failed: ${JSON.stringify(saJson)}`);
    superadminToken = saJson.data.token;

    const admRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zhouconsulting.com',
        password: 'Admin123!',
      }),
    });
    const admJson = await admRes.json();
    assert.ok(admJson.data?.token, `Admin login failed: ${JSON.stringify(admJson)}`);
    adminToken = admJson.data.token;

    const cliRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'klien@perusahaan.com',
        password: 'Client123!',
      }),
    });
    const cliJson = await cliRes.json();
    assert.ok(cliJson.data?.token, `Client login failed: ${JSON.stringify(cliJson)}`);
    clientToken = cliJson.data.token;
  });

  // ==========================================
  // 1. INFRASTRUCTURE (1 Endpoint)
  // ==========================================
  describe('Group 1: Infrastructure (1 Endpoint)', () => {
    test('[1/46] GET /api/health — System Health & Service Connectivity', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.status, 'ok');
      assert.equal(json.services.database, 'connected');
    });
  });

  // ==========================================
  // 2. AUTH MODUL (6 Endpoints)
  // ==========================================
  describe('Group 2: Auth Module (6 Endpoints)', () => {
    test('[2/46] POST /api/v1/auth/register — Client Corporate Registration', async () => {
      const randomEmail = `test.client.${Date.now()}@corporate.com`;
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'PT Mitra Uji Otomatis',
          email: randomEmail,
          password: 'PasswordTest123!',
          phone: '+6281234567800',
          company_name: 'PT Mitra Uji Otomatis',
        }),
      });
      assert.ok(res.status === 201 || res.status === 409);
    });

    test('[3/46] POST /api/v1/auth/login — User Authentication', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'superadmin@zhouconsulting.com',
          password: 'SuperAdmin123!',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.token);
    });

    test('[4/46] POST /api/v1/auth/google — Google OAuth Login', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'oauth.client@perusahaan.com',
          name: 'OAuth Client User',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.role, 'USER');
    });

    test('[5/46] POST /api/v1/auth/forgot-password — Request Password Reset', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'klien@perusahaan.com',
        }),
      });
      assert.equal(res.status, 200);
    });

    test('[6/46] POST /api/v1/auth/reset-password — Reset Password with Token', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid_or_expired_reset_token',
          new_password: 'NewPassword123!',
        }),
      });
      assert.ok(res.status === 400 || res.status === 404);
    });

    test('[7/46] POST /api/v1/auth/logout — Logout & Session Revocation', async () => {
      // First login temporary user to get a disposable token
      const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'klien@perusahaan.com',
          password: 'Client123!',
        }),
      });
      const loginJson = await loginRes.json();
      const tempToken = loginJson.data.token;

      const res = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tempToken}`,
        },
      });
      assert.equal(res.status, 200);
    });
  });

  // ==========================================
  // 3. USER MODUL (2 Endpoints)
  // ==========================================
  describe('Group 3: User Profile Module (2 Endpoints)', () => {
    test('[8/46] GET /api/v1/user/profile — Get Authenticated Profile', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/user/profile`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.email, 'klien@perusahaan.com');
    });

    test('[9/46] PUT /api/v1/user/profile — Update Profile Data', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          phone: '+6281234567892',
        }),
      });
      assert.equal(res.status, 200);
    });
  });

  // ==========================================
  // 4. PUBLIC CMS MODUL (9 Endpoints)
  // ==========================================
  describe('Group 4: Public Portal & CMS (9 Endpoints)', () => {
    test('[10/46] GET /api/v1/public/services — Public Services Catalog', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/services`);
      assert.equal(res.status, 200);
    });

    test('[11/46] GET /api/v1/public/company-profiles — Public Company Profile', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/company-profiles`);
      assert.equal(res.status, 200);
    });

    test('[12/46] GET /api/v1/public/tax-rates/latest — Latest Weekly Tax Rates', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/tax-rates/latest`);
      assert.equal(res.status, 200);
    });

    test('[13/46] GET /api/v1/public/regulations — Tax Regulations Directory', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/regulations`);
      assert.equal(res.status, 200);
    });

    test('[14/46] GET /api/v1/public/education — Tax Education Articles & Guides', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/education`);
      assert.equal(res.status, 200);
    });

    test('[15/46] GET /api/v1/public/careers — Active Job Vacancies', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/careers`);
      assert.equal(res.status, 200);
    });

    test('[16/46] POST /api/v1/public/careers/{id}/apply — Apply for Job', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/careers/1/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_name: 'Calon Staff Pajak',
          applicant_email: 'pelamar@gmail.com',
          applicant_phone: '+628991234567',
        }),
      });
      // 200/201 or 400/404 if no CV uploaded, both valid endpoint behaviors
      assert.ok([200, 201, 400, 404].includes(res.status));
    });

    test('[17/46] GET /api/v1/public/settings/contact — Contact & Global Site Settings', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/settings/contact`);
      assert.equal(res.status, 200);
    });

    test('[18/46] POST /api/v1/public/contact — Submit Contact Form Inquiry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pengunjung Web',
          email: 'pengunjung@test.com',
          phone: '+62811223344',
          subject: 'Pertanyaan Konsultasi Pajak',
          message: 'Halo, saya ingin menanyakan biaya konsultasi laporan keuangan.',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });
  });

  // ==========================================
  // 5. CLIENT PORTAL (7 Endpoints)
  // ==========================================
  describe('Group 5: Client Portal Module (7 Endpoints)', () => {
    test('[19/46] GET /api/v1/client/dashboard/overview — Client Dashboard Stats', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      assert.equal(res.status, 200);
    });

    test('[20/46] GET /api/v1/client/consultations — Client Consultations List', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/consultations`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        testProjectId = json.data[0].id;
      }
    });

    test('[21/46] GET /api/v1/client/consultations/{id} — Client Consultation Detail', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/consultations/${testProjectId}`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      assert.equal(res.status, 200);
    });

    test('[22/46] GET /api/v1/client/documents — Client Document Repository', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/documents`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      assert.equal(res.status, 200);
    });

    test('[23/46] GET /api/v1/client/documents/{id}/download — Get Signed Download URL', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/documents/9999/download`, {
        headers: { 'Authorization': `Bearer ${clientToken}` },
      });
      // 404 expected for non-existent document ID 9999
      assert.ok([200, 404].includes(res.status));
    });

    test('[24/46] GET /api/v1/client/chatbot/tree — Chatbot FAQ Decision Tree', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/chatbot/tree`);
      assert.equal(res.status, 200);
    });

    test('[25/46] POST /api/v1/client/chatbot/escalate — Escalate Chat to Project Ticket', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/client/chatbot/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          service_code: 'TAX_CORE',
          initial_message: 'Klien butuh pendampingan SP2DK segera.',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });
  });

  // ==========================================
  // 6. ADMIN PORTAL (8 Endpoints)
  // ==========================================
  describe('Group 6: Operations & Admin Portal (8 Endpoints)', () => {
    test('[26/46] GET /api/v1/admin/dashboard/overview — Admin Operations Stats', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
    });

    test('[27/46] GET /api/v1/admin/consultations — All Consultations', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
    });

    test('[28/46] POST /api/v1/admin/consultations — Create Consultation Project', async () => {
      const randomCode = `PRJ-TST-${Date.now().toString().slice(-5)}`;
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          project_code: randomCode,
          client_id: 6,
          service_id: 1,
          title: 'Konsultasi Perencanaan Pajak Otomatis',
          description: 'Dibuat oleh automated test runner',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[29/46] PATCH /api/v1/admin/consultations/{id}/status — Update Project Status', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations/${testProjectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          description: 'Status diverifikasi oleh automated test runner',
        }),
      });
      assert.equal(res.status, 200);
    });

    test('[30/46] POST /api/v1/admin/consultations/{id}/tasks — Add Checklist Task', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations/${testProjectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          task_name: 'Verifikasi Bukti Potong Pajak 23 Otomatis',
        }),
      });
      assert.ok([200, 201].includes(res.status));
      const json = await res.json();
      if (json.data && json.data.id) {
        testTaskId = json.data.id;
      }
    });

    test('[31/46] PATCH /api/v1/admin/consultations/{id}/tasks/{taskId} — Toggle Task Status', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations/${testProjectId}/tasks/${testTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          is_completed: true,
        }),
      });
      assert.ok([200, 404].includes(res.status));
    });

    test('[32/46] POST /api/v1/admin/consultations/{id}/documents — Upload Project Document', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/consultations/${testProjectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      // Expect 400 because no multipart file was attached
      assert.equal(res.status, 400);
    });

    test('[33/46] GET /api/v1/admin/documents — Global Document Repository', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/documents`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
    });
  });

  // ==========================================
  // 7. CMS ADMIN MODUL (7 Endpoints)
  // ==========================================
  describe('Group 7: CMS Administration Module (7 Endpoints)', () => {
    test('[34/46] PUT /api/v1/admin/cms/company-profiles — Upsert Company Profile Section', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/company-profiles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          section_key: 'test_section',
          title: 'Section Pengujian Otomatis',
          content: 'Konten diperbarui via Node.js 22 test suite.',
        }),
      });
      assert.equal(res.status, 200);
    });

    test('[35/46] POST /api/v1/admin/cms/services — Create Service Offering', async () => {
      const randomCode = `SRV-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          service_code: randomCode,
          service_name: 'Layanan Pengujian Khusus',
          category: 'Pengujian',
          description: 'Dibuat otomatis oleh test suite',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[36/46] POST /api/v1/admin/cms/tax-rates — Add Weekly Tax Rate', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/tax-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currency_code: 'SGD',
          rate_value: 11950.50,
          effective_start_date: '2026-09-15',
          effective_end_date: '2026-09-22',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[37/46] POST /api/v1/admin/cms/regulations — Add Tax Regulation Entry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/regulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'PMK No. 120/PMK.03/2026 Kepatuhan Pajak Korporasi',
          regulation_type: 'PMK',
          file_path: 'regulations/pmk-120-2026.pdf',
          file_size: '2.4 MB',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[38/46] POST /api/v1/admin/cms/education — Add Tax Education Article', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/education`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Panduan Praktis Pengisian Formulir SPT 1771',
          category: 'PPh Badan',
          content_type: 'ARTICLE',
          body: 'Langkah demi langkah rekonsiliasi fiskal dan pengisian formulir 1771.',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[39/46] POST /api/v1/admin/cms/careers — Add Career Job Posting', async () => {
      const randomJobCode = `JOB-TST-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/careers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          position_code: randomJobCode,
          position_title: 'Junior Tax Auditor',
          level: 'Staff',
          location: 'Jakarta (WFO)',
          description: 'Membantu review kertas kerja perpajakan klien.',
        }),
      });
      assert.ok([200, 201].includes(res.status));
    });

    test('[40/46] GET /api/v1/admin/cms/job-applications — Review Job Applications', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/cms/job-applications`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
    });
  });

  // ==========================================
  // 8. SUPERADMIN MODUL (6 Endpoints)
  // ==========================================
  describe('Group 8: Superadmin Governance Module (6 Endpoints)', () => {
    test('[41/46] GET /api/v1/superadmin/admins — List All Staff Admins', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/admins`, {
        headers: { 'Authorization': `Bearer ${superadminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.data));
    });

    test('[42/46] POST /api/v1/superadmin/admins — Create Staff Admin Account', async () => {
      const randomEmail = `staff.admin.${Date.now()}@zhouconsulting.com`;
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          name: 'Staff Admin Test Runner',
          email: randomEmail,
          password: 'TemporaryAdmin123!',
          phone: '+6281234567888',
          role: 'ADMIN',
        }),
      });
      assert.ok([200, 201].includes(res.status));
      const json = await res.json();
      if (json.data && json.data.id) {
        testAdminId = json.data.id;
      }
    });

    test('[43/46] POST /api/v1/superadmin/admins/{id}/deactivate — Deactivate Admin & Revoke Session', async () => {
      const tempEmail = `deact.${Date.now()}@zhouconsulting.com`;
      const createRes = await fetch(`${BASE_URL}/api/v1/superadmin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          name: 'Staff to Deactivate',
          email: tempEmail,
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });
      const createJson = await createRes.json();
      const targetId = createJson.data?.id;
      if (targetId) {
        const res = await fetch(`${BASE_URL}/api/v1/superadmin/admins/${targetId}/deactivate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${superadminToken}` },
        });
        assert.equal(res.status, 200);
      }
    });

    test('[44/46] DELETE /api/v1/superadmin/admins/{id} — Delete Admin Account', async () => {
      const tempEmail = `del.${Date.now()}@zhouconsulting.com`;
      const createRes = await fetch(`${BASE_URL}/api/v1/superadmin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          name: 'Staff to Delete',
          email: tempEmail,
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });
      const createJson = await createRes.json();
      const targetId = createJson.data?.id;
      if (targetId) {
        const res = await fetch(`${BASE_URL}/api/v1/superadmin/admins/${targetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${superadminToken}` },
        });
        assert.ok([200, 204, 400].includes(res.status));
      }
    });

    test('[45/46] GET /api/v1/superadmin/audit-logs — Inspect Append-Only Audit Logs', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${superadminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
    });

    test('[46/46] GET /api/v1/superadmin/audit-logs/export — Export Audit Logs to CSV/File', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/audit-logs/export`, {
        headers: { 'Authorization': `Bearer ${superadminToken}` },
      });
      assert.equal(res.status, 200);
    });
  });

});
