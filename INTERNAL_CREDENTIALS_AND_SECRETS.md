# 🔐 DOKUMEN RAHASIA: KREDENSIAL SISTEM & PANDUAN INTERNAL DEVELOPER
**ZHOU CONSULTING WEB PLATFORM — BACKEND API**  
**Klasifikasi:** `STRICTLY CONFIDENTIAL / RAHASIA INTERNAL`  
**Target Pembaca:** Lead Developer, Backend & Frontend Engineers, QA Engineers, dan Stakeholder Resmi.  
**Dilarang Keras:** Mempublikasikan, mengunggah ke forum publik, atau mencantumkan isi dokumen ini ke dalam dokumentasi terbuka (`/docs` atau openapi publik).

---

## 📌 DAFTAR ISI
1. [Kebijakan Kerahasiaan & Keamanan Data](#1-kebijakan-kerahasiaan--keamanan-data)
2. [Kredensial Akun Pengujian Sistem (Database Seed Accounts)](#2-kredensial-akun-pengujian-sistem-database-seed-accounts)
3. [Arsitektur Server VPS & Lingkungan Hosting](#3-arsitektur-server-vps--lingkungan-hosting)
4. [Kredensial Layanan Cloud & Database (Third-Party Services)](#4-kredensial-layanan-cloud--database-third-party-services)
5. [Alur Otentikasi & Pengujian API di Scalar Docs](#5-alur-otentikasi--pengujian-api-di-scalar-docs)
6. [SOP Rotasi Kredensial & Penanganan Insiden Keamanan](#6-sop-rotasi-kredensial--penanganan-insiden-keamanan)
7. [Prosedur Deployment Kode ke VPS Server](#7-prosedur-deployment-kode-ke-vps-server)

---

## 1. Kebijakan Kerahasiaan & Keamanan Data

Dokumen ini disusun sebagai **Single Source of Truth** untuk seluruh kredensial pengujian akun, kunci enkripsi, dan parameter koneksi backend Zhou Consulting.

* **Alasan Pemisahan dari `/docs`:**  
  Sebelumnya, endpoint publik Scalar (`/docs`) dan landing page backend (`/`) memuat kata sandi pengujian dalam bentuk teks terbuka (*plaintext*). Demi mematuhi standar keamanan ISO 27001 / OWASP Top 10 API Security, seluruh kredensial tersebut telah diredaksi dari dokumentasi publik dan dipindahkan ke dokumen internal ini.
* Seluruh anggota tim pengembang wajib menjaga kerahasiaan kata sandi dan token API yang tercantum di bawah ini.

---

## 2. Kredensial Akun Pengujian Sistem (Database Seed Accounts)

Akun-akun berikut dibuat secara otomatis saat menjalankan database seeder (`npm run prisma:seed`):

### 👑 2.1 Akun SUPERADMIN (Akses Tertinggi)
* **Role:** `SUPERADMIN`
* **Nama Akun:** Super Administrator Zhou
* **Alamat Email:** `superadmin@zhouconsulting.com`
* **Kata Sandi:** `SuperAdmin123!`
* **Nomor Telepon:** `+6281234567890`
* **Perusahaan:** Zhou Consulting Group
* **Lingkup Wewenang:**
  * Akses penuh ke seluruh 46 endpoint backend.
  * Memeriksa Append-Only Audit Log sistem (`/api/v1/superadmin/audit-logs`).
  * Mengelola, membuat, menonaktifkan, atau mereset password akun staf admin.
  * Mengelola seluruh konten CMS (Layanan, Profil, Regulasi, Edukasi, Karir, dan FAQ).

---

### 💼 2.2 Akun ADMIN (Konsultan Operasional)
* **Role:** `ADMIN`
* **Nama Akun:** Konsultan Senior Zhou
* **Alamat Email:** `admin@zhouconsulting.com`
* **Kata Sandi:** `Admin123!`
* **Nomor Telepon:** `+6281234567891`
* **Perusahaan:** Zhou Consulting Group
* **Lingkup Wewenang:**
  * Manajemen perikatan klien dan tiket konsultasi aktif.
  * Menugaskan konsultan PIC (*Person In Charge*) ke tiket konsultasi.
  * Mengelola checklist tahapan tugas (*task checklist*) & persentase progres.
  * Memeriksa dan mengunggah berkas kerja klien via Supabase Storage.
  * Mengirim dan membalas pesan obrolan tiket perikatan.

---

### 👤 2.3 Akun USER (Klien / Publik)
* **Role:** `USER`
* **Nama Akun:** Budi Pratama (Direktur)
* **Alamat Email:** `klien@perusahaan.com`
* **Kata Sandi:** `Client123!`
* **Nomor Telepon:** `+6281234567892`
* **Perusahaan:** PT Maju Bersama Sejahtera
* **Lingkup Wewenang:**
  * Mengakses portal klien (`/api/v1/client/*`).
  * Mengajukan permohonan konsultasi perpajakan baru.
  * Mengunggah dokumen lampiran (SPT, Faktur Pajak, Laporan Keuangan).
  * Memantau progres penyelesaian tugas oleh tim konsultan.
  * Berkomunikasi langsung via tiket obrolan konsultasi.

---

### 🔄 2.4 Perintah Re-Seed Database
Jika database baru saja di-reset atau kredensial di atas terhapus, jalankan perintah seeder berikut di server/lokal:
```bash
npm run prisma:seed
```

---

## 3. Arsitektur Server VPS & Lingkungan Hosting

| Komponen | Spesifikasi / Alamat | Keterangan |
| :--- | :--- | :--- |
| **Primary VPS Server** | `139.190.103.80` | Server produksi aktif (Biznet Gio Ubuntu 22.04 LTS) |
| **Secondary / Legacy VPS**| `43.173.2.162` | Server cadangan / pengujian sebelumnya |
| **Domain Resmi Backend** | `https://api.zhouconsulting.id` | Nginx Reverse Proxy (SSL Let's Encrypt Port 443) |
| **Domain Resmi Frontend** | `https://www.zhouconsulting.id` | Next.js Vercel Production Deploy |
| **Port Internal Express** | `5000` | Dijalankan oleh PM2 Cluster (Localhost only) |
| **PM2 Process Name** | `zhou-backend` | Mode: cluster (1 instance per vCPU, max memory 800MB) |
| **Direktori Server VPS** | `/var/www/be-zhou` | Root repository backend |

---

## 4. Kredensial Layanan Cloud & Database (Third-Party Services)

> [!TIP]
> Nilai API key pihak ketiga (Resend & Google Cloud) dan password database produksi disimpan secara terisolasi pada file `.env` di VPS Server (`/var/www/be-zhou/.env`).

### 4.1 Database PostgreSQL (Supabase Cloud)
* **Provider:** Supabase AWS AP-Southeast-1 (Singapore)
* **Host:** `aws-0-ap-southeast-1.pooler.supabase.com`
* **Port:** `5432` (Connection Pooler)
* **Database Name:** `postgres`
* **User:** `postgres.akzqjzmlbtchaohnzvvo`
* **Format Connection String:** Dikelola pada environment `DATABASE_URL` di file `.env` server VPS.

### 4.2 Cache & Session Blacklist (Redis)
* **Host:** `localhost` / `redis://localhost:6379`
* **Fungsi:** Token JWT revocation blacklist (`blacklist:<jti>`), instant user deactivation (`user_revoked:<id>`), rate limiting store, dan cache FAQ chatbot.

### 4.3 Supabase Object Storage (Dokumen & Berkas)
* **Project URL:** `https://akzqjzmlbtchaohnzvvo.supabase.co`
* **Bucket Utama:** `zhou-documents`
* **Key Access:** `SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY` dikonfigurasi via file `.env`.

### 4.4 Google OAuth 2.0 (Otentikasi Klien)
* **Google Client ID & Secret:** Dikonfigurasi via Google Cloud Console & tersimpan pada `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`.

### 4.5 Resend Email Service (Notifikasi Transaksional)
* **API Key:** Dikonfigurasi pada variabel `RESEND_API_KEY` di `.env`.
* **Default Sender:** `onboarding@resend.dev` *(atau `noreply@zhouconsulting.com` setelah domain terverifikasi di Resend)*

### 4.6 JWT Configuration
* **JWT Secret:** Dikelola pada variabel `JWT_SECRET` di `.env`.
* **Expired:** `1d` (24 Jam)

---

## 5. Alur Otentikasi & Pengujian API di Scalar Docs

Pengujian seluruh 46 endpoint melalui antarmuka Scalar (`/docs`) dapat dilakukan dengan langkah berikut:

1. **Buka Scalar Docs:** Akses `https://api.zhouconsulting.id/docs`.
2. **Kirim Login Request:**
   * Buka grup **Auth** ➔ `POST /api/v1/auth/login`.
   * Klik tombol **Test Request**.
   * Masukkan email dan password salah satu akun uji dari **Bagian 2** dokumen ini:
     ```json
     {
       "email": "admin@zhouconsulting.com",
       "password": "Admin123!"
     }
     ```
   * Klik **Send**.
3. **Salin Token JWT:** Salin nilai teks dari field `data.token`.
4. **Pasang Bearer Token di Scalar:**
   * Pada bilah navigasi kanan atas Scalar, klik tombol **Authentication / BearerAuth**.
   * Tempelkan (*paste*) nilai token.
5. **Jalankan Pengujian Endpoint Terproteksi:** Seluruh endpoint klien/admin sekarang dapat diuji secara interaktif langsung dari peramban.

---

## 6. SOP Rotasi Kredensial & Penanganan Insiden Keamanan

### 6.1 Jika Password Akun Staf Admin Terkompromi
Superadmin dapat langsung mereset password staf admin tanpa downtime:
```http
PATCH /api/v1/superadmin/admins/{id}/password
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "new_password": "NewStrongPassword123!"
}
```

### 6.2 Jika Akun Staf Admin Harus Dinonaktifkan Seketika
Jalankan penonaktifan darurat:
```http
POST /api/v1/superadmin/admins/{id}/deactivate
Authorization: Bearer <superadmin_token>
```
*Sistem secara otomatis memasukkan ID pengguna ke Redis key `user_revoked:{id}` dengan durasi 24 jam sehingga seluruh sesi aktif staf tersebut langsung terputus secara instan.*

---

## 7. Prosedur Deployment Kode ke VPS Server

Jika tim melakukan perubahan kode di branch `dev` atau `main`:

```bash
# 1. Masuk ke server VPS via SSH
ssh ubuntu@139.190.103.80

# 2. Masuk ke direktori aplikasi backend
cd /var/www/be-zhou

# 3. Tarik pembaruan kode terbaru dari branch dev (atau main)
git pull origin dev

# 4. Kompilasi TypeScript ke folder dist/
npm run build

# 5. Reload proses PM2 cluster (Zero Downtime)
pm2 reload zhou-backend
```

---
*Dokumen ini dikelola dan diperbarui oleh Tim Backend Zhou Consulting.*
