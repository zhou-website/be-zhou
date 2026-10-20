import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma, pool } from '../src/config/database.js';
import http from 'http';

let server: http.Server;
let baseUrl = '';
let superadminToken = '';

describe('🎯 Zhou Consulting — FE Admin Requirements & Corrections Test Suite', () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

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
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await pool.end();
    await prisma.$disconnect();
  });

  test('Point 1: User ID 23 (ana@zhouconsulting) is purged from database', async () => {
    const user23 = await prisma.user.findUnique({ where: { id: 23 } });
    assert.strictEqual(user23, null, 'User 23 must be completely removed from database');
  });

  test('Point 3: Informative validation errors when creating admin', async () => {
    // 3.1 Invalid email format
    const resBadEmail = await fetch(`${baseUrl}/api/v1/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        name: 'Staff Testing',
        email: 'not-an-email',
        password: 'AdminPassword123!',
      }),
    });
    const dataBadEmail = await resBadEmail.json();
    assert.strictEqual(resBadEmail.status, 400);
    assert.match(dataBadEmail.message, /format email tidak valid/i);
    assert.ok(Array.isArray(dataBadEmail.errors));

    // 3.2 Weak password (no uppercase or no digit, or < 8 chars)
    const resWeakPass = await fetch(`${baseUrl}/api/v1/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        name: 'Staff Testing',
        email: 'test_staff_weak@zhouconsulting.com',
        password: 'weak',
      }),
    });
    const dataWeakPass = await resWeakPass.json();
    assert.strictEqual(resWeakPass.status, 400);
    assert.strictEqual(
      dataWeakPass.message,
      'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka'
    );
    assert.ok(
      dataWeakPass.errors.some((e: any) =>
        e.message.includes('Password minimal 8 karakter dengan 1 huruf besar dan 1 angka')
      )
    );

    // 3.3 Duplicate email
    const resDuplicate = await fetch(`${baseUrl}/api/v1/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Staff',
        email: 'admin@zhouconsulting.com',
        password: 'ValidPassword123!',
      }),
    });
    const dataDuplicate = await resDuplicate.json();
    assert.strictEqual(resDuplicate.status, 409);
    assert.strictEqual(dataDuplicate.message, 'Email admin@zhouconsulting.com sudah terdaftar');
    assert.ok(
      dataDuplicate.errors.some((e: any) =>
        e.message.includes('Email admin@zhouconsulting.com sudah terdaftar')
      )
    );
  });

  test('Point 4 & Creation: Superadmin can create clean new admin staff (e.g., ana@zhouconsulting.com)', async () => {
    // Delete test staff if previously created
    await prisma.user.deleteMany({
      where: { email: 'ana@zhouconsulting.com' },
    });

    const createRes = await fetch(`${baseUrl}/api/v1/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        name: 'Selvianna, S.E',
        email: 'ana@zhouconsulting.com',
        password: 'AnaPassword123!',
        phone: '+6281298761201',
        role: 'ADMIN',
      }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.data.email, 'ana@zhouconsulting.com');

    // Verify login with newly created admin credentials
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ana@zhouconsulting.com',
        password: 'AnaPassword123!',
      }),
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.data.user.email, 'ana@zhouconsulting.com');
  });

  test('Point 2: Dedicated Reset Staff Password Endpoint (PATCH /api/v1/superadmin/admins/:id/password)', async () => {
    const ana = await prisma.user.findUnique({
      where: { email: 'ana@zhouconsulting.com' },
    });
    assert.ok(ana);

    // 2.1 Reset password without needing old password
    const resetRes = await fetch(`${baseUrl}/api/v1/superadmin/admins/${ana.id}/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        password: 'NewAnaPassword999!',
      }),
    });
    const resetData = await resetRes.json();
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetData.success, true);
    assert.strictEqual(resetData.message, 'Kata sandi staf admin berhasil diperbarui');

    // 2.2 Verify new password can be used to log in
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ana@zhouconsulting.com',
        password: 'NewAnaPassword999!',
      }),
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);

    // 2.3 Also verify PUT /api/v1/superadmin/admins/:id can update password via new_password or password
    const putRes = await fetch(`${baseUrl}/api/v1/superadmin/admins/${ana.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        new_password: 'UpdatedViaPut888!',
      }),
    });
    const putData = await putRes.json();
    assert.strictEqual(putRes.status, 200);

    const loginPutRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ana@zhouconsulting.com',
        password: 'UpdatedViaPut888!',
      }),
    });
    assert.strictEqual(loginPutRes.status, 200);

    // Clean up created test admin
    await prisma.user.delete({ where: { id: ana.id } });
  });
});
