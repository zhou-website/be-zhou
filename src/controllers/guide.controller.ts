import { Request, Response } from 'express';

export const getApiGuide = (req: Request, res: Response): void => {
  const isHtml = req.accepts('html') && !req.accepts('json');

  const guideData = {
    success: true,
    service: 'Zhou Consulting — Backend API Service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    status: 'operational',
    timestamp: new Date().toISOString(),
    documentation: {
      interactiveDocs: '/docs',
      healthCheck: '/api/health',
      baseApiUrl: '/api/v1',
    },
    testingAccounts: {
      superadmin: {
        email: 'superadmin@zhouconsulting.com',
        password: 'SuperAdmin123!',
        role: 'SUPERADMIN',
      },
      admin: {
        email: 'admin@zhouconsulting.com',
        password: 'Admin123!',
        role: 'ADMIN',
      },
    },
    authenticationFlow: {
      step1: 'Kirim POST /api/v1/auth/login dengan payload { email, password }',
      step2: 'Simpan token yang ada di data.token',
      step3: 'Sertakan header "Authorization: Bearer <token>" pada setiap request terproteksi',
    },
    corsStatus: {
      enabled: true,
      credentials: true,
      allowedOrigins: 'Semua origin diizinkan selama masa pengujian & deployment (localhost:3000, localhost:5173, PM laptop, preview URL, dll.)',
    },
    popularEndpoints: [
      { method: 'GET', path: '/docs', description: 'Interactive Scalar API Documentation (Coba langsung di browser)' },
      { method: 'GET', path: '/api/health', description: 'Pemeriksaan status database & Redis' },
      { method: 'POST', path: '/api/v1/auth/login', description: 'Login akun Superadmin / Admin / Klien' },
      { method: 'POST', path: '/api/v1/auth/register', description: 'Registrasi mandiri akun klien' },
      { method: 'GET', path: '/api/v1/cms/company-profiles', description: 'Profil perusahaan & visi misi (Publik)' },
      { method: 'GET', path: '/api/v1/cms/services', description: 'Daftar layanan perpajakan & konsultasi (Publik)' },
      { method: 'POST', path: '/api/v1/consultations', description: 'Pengajuan konsultasi pajak (Klien)' },
      { method: 'GET', path: '/api/v1/admin/dashboard/summary', description: 'Ringkasan analitik dashboard (Admin/Superadmin)' },
      { method: 'GET', path: '/api/v1/superadmin/audit-logs', description: 'Pemeriksaan Append-Only Audit Log (Superadmin)' },
    ],
  };

  // Jika client meminta HTML (misalnya dibuka langsung di browser oleh PM atau tester)
  if (req.accepts('html')) {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zhou Consulting — Backend API & Panduan Pengujian</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: #1e293b;
      --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.12) 0px, transparent 50%);
      color: var(--text-main);
      font-family: var(--font);
      min-height: 100vh;
      padding: 2.5rem 1.5rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .container {
      max-width: 960px;
      width: 100%;
    }
    .header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 2rem 2.5rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      margin-bottom: 2rem;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.25rem;
      color: #fff;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .brand-text h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-text p {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #34d399;
    }
    .pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .hero-desc {
      color: #cbd5e1;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }
    .btn-secondary {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: #e2e8f0;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #fff;
      transform: translateY(-2px);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 1.75rem;
      backdrop-filter: blur(12px);
    }
    .card h2 {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #e2e8f0;
    }
    .account-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .account-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 0.5rem;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .credential-label {
      color: var(--text-muted);
    }
    .credential-value {
      font-family: var(--mono);
      background: #0f172a;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      color: #38bdf8;
      font-size: 0.8125rem;
    }
    .steps {
      list-style: none;
      counter-reset: step-counter;
    }
    .steps li {
      counter-increment: step-counter;
      position: relative;
      padding-left: 2rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      line-height: 1.5;
      color: #cbd5e1;
    }
    .steps li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0;
      width: 1.35rem;
      height: 1.35rem;
      background: #2563eb;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
    }
    .code-block {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.625rem;
      padding: 0.75rem 1rem;
      font-family: var(--mono);
      font-size: 0.8125rem;
      color: #34d399;
      margin-top: 0.5rem;
      overflow-x: auto;
    }
    .table-container {
      overflow-x: auto;
      margin-top: 0.75rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      color: #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: var(--mono);
    }
    .badge-get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge-post { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-cors { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Card -->
    <div class="header">
      <div class="header-top">
        <div class="brand">
          <div class="logo-icon">Z</div>
          <div class="brand-text">
            <h1>Zhou Consulting Backend API</h1>
            <p>Sistem Layanan API & Integrasi Aplikasi Konsultan Pajak</p>
          </div>
        </div>
        <div class="status-badge">
          <span class="pulse"></span>
          <span>API Online & Operational</span>
        </div>
      </div>
      
      <p class="hero-desc">
        Backend API aktif dan siap digunakan untuk pengujian Frontend, Mobile, dan QA. Seluruh rute dilindungi dengan enkripsi JWT, Audit Logging terisolasi PostgreSQL, dan dukungan penuh CORS cross-origin.
      </p>

      <div class="btn-group">
        <a href="/docs" class="btn btn-primary" target="_blank">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          Buka Scalar Interactive API Docs
        </a>
        <a href="/api/health" class="btn btn-secondary" target="_blank">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Cek Status Database & Redis (/api/health)
        </a>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid">
      <!-- Panduan Akun Uji Coba -->
      <div class="card">
        <h2>🔑 Akun Pengujian (Testing Credentials)</h2>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
          Gunakan akun berikut untuk melakukan login via <code>POST /api/v1/auth/login</code>:
        </p>

        <div class="account-box">
          <div class="account-title">Role: SUPERADMIN</div>
          <div class="credential-row">
            <span class="credential-label">Email:</span>
            <span class="credential-value">superadmin@zhouconsulting.com</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Password:</span>
            <span class="credential-value">SuperAdmin123!</span>
          </div>
        </div>

        <div class="account-box">
          <div class="account-title">Role: ADMIN</div>
          <div class="credential-row">
            <span class="credential-label">Email:</span>
            <span class="credential-value">admin@zhouconsulting.com</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Password:</span>
            <span class="credential-value">Admin123!</span>
          </div>
        </div>

        <div class="account-box" style="margin-bottom: 0;">
          <div class="account-title" style="color: #34d399;">Role: KLIEN (Publik)</div>
          <p style="font-size: 0.8125rem; color: #cbd5e1;">
            Dapat langsung mendaftar via <code>POST /api/v1/auth/register</code> atau menggunakan kredensial yang dibuat saat registrasi.
          </p>
        </div>
      </div>

      <!-- Panduan Alur Uji Coba -->
      <div class="card">
        <h2>🚀 Cara Cepat Melakukan Uji Coba API</h2>
        <ol class="steps">
          <li>
            <strong>Buka Dokumentasi Interaktif:</strong><br>
            Klik tombol <strong>Scalar Docs</strong> di atas (atau akses <code>/docs</code>). Anda dapat mencoba seluruh 46 endpoint langsung dari browser tanpa perlu Postman.
          </li>
          <li>
            <strong>Otentikasi & Ambil Token:</strong><br>
            Kirim request ke endpoint login:
            <div class="code-block">POST /api/v1/auth/login</div>
            Salin nilai <code>data.token</code> dari respons.
          </li>
          <li>
            <strong>Gunakan Header Authorization:</strong><br>
            Pada setiap request berikutnya yang membutuhkan akses, sertakan header:
            <div class="code-block">Authorization: Bearer &lt;token_anda&gt;</div>
          </li>
          <li>
            <strong>Status CORS:</strong><br>
            <span class="badge badge-cors">CORS ACTIVE</span> Semua origin (termasuk <code>http://localhost:3000</code>, <code>localhost:5173</code>, dan Vercel) telah diizinkan.
          </li>
        </ol>
      </div>
    </div>

    <!-- Endpoint Table Card -->
    <div class="card" style="margin-bottom: 2rem;">
      <h2>📋 Endpoint Utama yang Siap Ditest</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Metode</th>
              <th>Path Endpoint</th>
              <th>Keterangan / Fungsi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/docs</code></td>
              <td>Interactive Scalar API Docs (Uji coba interaktif di browser)</td>
            </tr>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/api/health</code></td>
              <td>Health check status PostgreSQL & Redis</td>
            </tr>
            <tr>
              <td><span class="badge badge-post">POST</span></td>
              <td><code>/api/v1/auth/login</code></td>
              <td>Login akun Superadmin, Admin, atau Klien</td>
            </tr>
            <tr>
              <td><span class="badge badge-post">POST</span></td>
              <td><code>/api/v1/auth/register</code></td>
              <td>Registrasi mandiri akun klien baru</td>
            </tr>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/api/v1/cms/company-profiles</code></td>
              <td>Mendapatkan profil perusahaan, visi, dan misi (Publik)</td>
            </tr>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/api/v1/cms/services</code></td>
              <td>Daftar layanan konsultasi & kepatuhan pajak (Publik)</td>
            </tr>
            <tr>
              <td><span class="badge badge-post">POST</span></td>
              <td><code>/api/v1/consultations</code></td>
              <td>Mengajukan konsultasi pajak baru (Klien)</td>
            </tr>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/api/v1/admin/dashboard/summary</code></td>
              <td>Ringkasan statistik data klien & proyek (Admin)</td>
            </tr>
            <tr>
              <td><span class="badge badge-get">GET</span></td>
              <td><code>/api/v1/superadmin/audit-logs</code></td>
              <td>Audit log immutable riwayat aktivitas sistem (Superadmin)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Zhou Consulting &copy; 2026 &bull; Tim Pengembang Backend &bull; Express.js 5 &bull; Prisma ORM &bull; PostgreSQL &bull; Redis
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
    return;
  }

  // Jika client meminta JSON (curl / postman / API client)
  res.status(200).json(guideData);
};
