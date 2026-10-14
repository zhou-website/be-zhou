const fs = require('fs');
const path = require('path');

const openApiPath = path.resolve(__dirname, '..', 'docs', 'openapi.json');
const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// 1. Tambahkan Tag atau Perbarui Tag Superadmin & CMS
spec.tags = (spec.tags || []).map((t) => {
  if (t.name === 'CMS Admin') {
    return {
      name: 'CMS Admin',
      description: 'Manajemen konten CMS (Khusus Superadmin sesuai Revisi FE Item #9 & #10)',
    };
  }
  return t;
});

// Helper PDF multipart schema
const createPdfUploadSchema = (additionalProps = {}) => ({
  type: 'object',
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'Unggah berkas fisik dokumen (Format PDF, Maksimal 10MB)',
      contentMediaType: 'application/pdf',
    },
    file_type: {
      type: 'string',
      enum: ['PDF'],
      default: 'PDF',
      description: 'Pilihan format jenis berkas input: PDF',
    },
    ...additionalProps,
  },
  required: ['file'],
});

// 2. Client Consultation Document Upload (POST /api/v1/client/consultations/{id}/documents)
if (spec.paths['/api/v1/client/consultations/{id}/documents']) {
  spec.paths['/api/v1/client/consultations/{id}/documents'].post.requestBody = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: createPdfUploadSchema({
          file_name: { type: 'string', example: 'Laporan_Keuangan_Klien.pdf', description: 'Nama berkas dokumen' },
        }),
      },
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            file_name: { type: 'string', example: 'Laporan_Keuangan_Klien.pdf' },
            file_path: { type: 'string', example: 'documents/klien/Laporan_Keuangan.pdf' },
            file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
          },
        },
      },
    },
  };
}

// 3. Admin Consultation Document Upload (POST /api/v1/admin/consultations/{id}/documents)
if (spec.paths['/api/v1/admin/consultations/{id}/documents']) {
  spec.paths['/api/v1/admin/consultations/{id}/documents'].post.requestBody = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: createPdfUploadSchema({
          file_name: { type: 'string', example: 'Kertas_Kerja_Pemeriksaan.pdf', description: 'Nama berkas laporan/kertas kerja' },
        }),
      },
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            file_name: { type: 'string', example: 'Kertas_Kerja_Pemeriksaan.pdf' },
            file_path: { type: 'string', example: 'documents/project-1/Kertas_Kerja.pdf' },
            file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
          },
        },
      },
    },
  };
}

// 4. Career Applications (POST /api/v1/public/careers/{id}/apply & POST /api/v1/careers/{id}/apply)
const careerApplySpec = {
  post: {
    tags: ['Public CMS'],
    summary: 'Kirim Lamaran Karir & Unggah CV (Publik / Tanpa Login)',
    description: 'Pengunjung dapat melamar lowongan kerja aktif tanpa autentikasi (Item #6). Dalam lowongan yang sama, satu alamat email hanya dapat mengirimkan satu lamaran (Item #7). Berkas CV disimpan ke folder cvs Supabase Storage.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Lowongan Pekerjaan Aktif',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              applicant_name: { type: 'string', example: 'Budi Santoso', description: 'Nama lengkap pelamar' },
              applicant_email: { type: 'string', format: 'email', example: 'budi.santoso@example.com', description: 'Alamat email aktif (dibatasi 1 lamaran per lowongan)' },
              applicant_phone: { type: 'string', example: '+6281234567890', description: 'Nomor WhatsApp / telepon' },
              file: {
                type: 'string',
                format: 'binary',
                description: 'Unggah berkas CV pelamar (Format PDF, Maksimal 10MB)',
                contentMediaType: 'application/pdf',
              },
              file_type: {
                type: 'string',
                enum: ['PDF'],
                default: 'PDF',
                description: 'Pilihan jenis format file input: PDF',
              },
              cv_file_path: { type: 'string', example: 'cvs/cv-budi.pdf', description: 'Path Supabase Storage (opsional jika upload file fisik)' },
            },
            required: ['applicant_name', 'applicant_email', 'file'],
          },
        },
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              applicant_name: { type: 'string', example: 'Budi Santoso' },
              applicant_email: { type: 'string', example: 'budi.santoso@example.com' },
              applicant_phone: { type: 'string', example: '+6281234567890' },
              cv_file_path: { type: 'string', example: 'cvs/cv-budi.pdf' },
              file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
            },
            required: ['applicant_name', 'applicant_email', 'cv_file_path'],
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Lamaran kerja berhasil dikirimkan',
      },
      '400': {
        description: 'Validasi gagal (email sudah pernah melamar atau berkas CV tidak ada)',
      },
      '404': {
        description: 'Lowongan pekerjaan tidak ditemukan',
      },
    },
  },
};
spec.paths['/api/v1/public/careers/{id}/apply'] = careerApplySpec;
spec.paths['/api/v1/careers/{id}/apply'] = careerApplySpec;

// 5. Regulation CMS (POST /api/v1/admin/cms/regulations & PUT /api/v1/admin/cms/regulations/{id})
const regCreateSpec = {
  post: {
    tags: ['CMS Admin'],
    summary: 'Unggah Peraturan Perpajakan Baru (Khusus Superadmin)',
    description: 'Menambahkan peraturan perpajakan baru dengan lampiran berkas resmi PDF ke Supabase Storage. Khusus Superadmin (Item #9).',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'PMK No. 48/PMK.03/2026 tentang Tata Cara Pelaporan SPT Masa PPh' },
              regulation_type: { type: 'string', example: 'Peraturan Menteri Keuangan' },
              file: {
                type: 'string',
                format: 'binary',
                description: 'Unggah berkas salinan regulasi resmi (Format PDF, Maksimal 10MB)',
                contentMediaType: 'application/pdf',
              },
              file_type: {
                type: 'string',
                enum: ['PDF'],
                default: 'PDF',
                description: 'Pilihan format jenis berkas input: PDF',
              },
            },
            required: ['title', 'regulation_type', 'file'],
          },
        },
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'PMK No. 48/PMK.03/2026' },
              regulation_type: { type: 'string', example: 'Peraturan Menteri Keuangan' },
              file_path: { type: 'string', example: 'regulations/pmk48.pdf' },
              file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
            },
            required: ['title', 'regulation_type', 'file_path'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'Regulasi berhasil ditambahkan' },
      '400': { description: 'Input data tidak lengkap' },
      '403': { description: 'Akses dilarang (Khusus Superadmin)' },
    },
  },
};
spec.paths['/api/v1/admin/cms/regulations'] = regCreateSpec;

if (spec.paths['/api/v1/admin/cms/regulations/{id}']) {
  spec.paths['/api/v1/admin/cms/regulations/{id}'].put.requestBody = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'PMK No. 48/PMK.03/2026 (Revisi)' },
            regulation_type: { type: 'string', example: 'Peraturan Menteri Keuangan' },
            file: {
              type: 'string',
              format: 'binary',
              description: 'Unggah salinan dokumen revisi regulasi (Format PDF)',
              contentMediaType: 'application/pdf',
            },
            file_type: {
              type: 'string',
              enum: ['PDF'],
              default: 'PDF',
              description: 'Pilihan format jenis berkas input: PDF',
            },
          },
        },
      },
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'PMK No. 48/PMK.03/2026' },
            regulation_type: { type: 'string', example: 'Peraturan Menteri Keuangan' },
            file_path: { type: 'string', example: 'regulations/pmk48.pdf' },
            file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
          },
        },
      },
    },
  };
}

// 6. Education CMS (POST /api/v1/admin/cms/education & PUT /api/v1/admin/cms/education/{id})
const eduCreateSpec = {
  post: {
    tags: ['CMS Admin'],
    summary: 'Publikasi Materi Edukasi Perpajakan (Khusus Superadmin)',
    description: 'Menambahkan artikel literasi perpajakan atau buku panduan teknis dengan penambahan foto artikel dan berkas PDF panduan yang dikelola oleh BE (Item Penambahan Foto BE & Item #9).',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Panduan Lengkap Kesiapan Transisi Coretax DJP 2026' },
              category: { type: 'string', example: 'Kesiapan Coretax' },
              content_type: { type: 'string', enum: ['ARTICLE', 'GUIDE'], default: 'GUIDE', description: 'Tipe konten materi' },
              body: { type: 'string', example: 'Uraian isi edukasi perpajakan secara komprehensif...' },
              file: {
                type: 'string',
                format: 'binary',
                description: 'Unggah berkas e-book panduan teknis (Format PDF, Maksimal 10MB)',
                contentMediaType: 'application/pdf',
              },
              file_type: {
                type: 'string',
                enum: ['PDF'],
                default: 'PDF',
                description: 'Pilihan format jenis berkas panduan: PDF',
              },
              image: {
                type: 'string',
                format: 'binary',
                description: 'Unggah foto / cover materi edukasi (PNG, JPG, WEBP)',
              },
              image_url: {
                type: 'string',
                example: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
                description: 'URL foto cover alternatif jika tidak mengunggah file',
              },
            },
            required: ['title'],
          },
        },
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Panduan Transisi Coretax DJP' },
              category: { type: 'string', example: 'Kesiapan Coretax' },
              content_type: { type: 'string', enum: ['ARTICLE', 'GUIDE'], default: 'ARTICLE' },
              body: { type: 'string', example: 'Isi artikel...' },
              file_path: { type: 'string', example: 'education/panduan_coretax.pdf' },
              image_url: { type: 'string', example: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' },
              file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
            },
            required: ['title'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'Materi edukasi berhasil diterbitkan beserta foto & berkas' },
      '403': { description: 'Akses dilarang (Khusus Superadmin)' },
    },
  },
};
spec.paths['/api/v1/admin/cms/education'] = eduCreateSpec;

if (spec.paths['/api/v1/admin/cms/education/{id}']) {
  spec.paths['/api/v1/admin/cms/education/{id}'].put.requestBody = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Panduan Lengkap Kesiapan Transisi Coretax DJP (Update)' },
            category: { type: 'string', example: 'Kesiapan Coretax' },
            content_type: { type: 'string', enum: ['ARTICLE', 'GUIDE'], default: 'GUIDE' },
            body: { type: 'string', example: 'Pembaruan materi edukasi...' },
            file: {
              type: 'string',
              format: 'binary',
              description: 'Unggah berkas revisi panduan (Format PDF)',
              contentMediaType: 'application/pdf',
            },
            file_type: {
              type: 'string',
              enum: ['PDF'],
              default: 'PDF',
              description: 'Pilihan format jenis berkas input: PDF',
            },
            image: {
              type: 'string',
              format: 'binary',
              description: 'Unggah foto cover materi baru',
            },
            image_url: { type: 'string', example: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' },
          },
        },
      },
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Panduan Coretax (Update)' },
            category: { type: 'string', example: 'Kesiapan Coretax' },
            content_type: { type: 'string', enum: ['ARTICLE', 'GUIDE'] },
            body: { type: 'string', example: 'Pembaruan isi...' },
            file_path: { type: 'string', example: 'education/panduan.pdf' },
            image_url: { type: 'string', example: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' },
            file_type: { type: 'string', enum: ['PDF'], default: 'PDF' },
          },
        },
      },
    },
  };
}

// 7. Universal / Public Upload Helper (POST /api/v1/public/upload & POST /api/v1/upload)
const uploadHelperSpec = {
  post: {
    tags: ['Public CMS'],
    summary: 'Unggah Berkas ke Supabase Storage (Mendukung PDF)',
    description: 'Endpoint universal untuk mengunggah berkas fisik (PDF, dokumen kerja, CV, gambar) langsung ke Supabase Storage.',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: createPdfUploadSchema({
            folder: { type: 'string', example: 'documents', description: 'Folder target di Supabase: documents, cvs, education, regulations' },
          }),
        },
      },
    },
    responses: {
      '201': { description: 'Berkas berhasil diunggah' },
    },
  },
};
spec.paths['/api/v1/public/upload'] = uploadHelperSpec;
spec.paths['/api/v1/upload'] = uploadHelperSpec;

// 8. Public Chatbot Tree for Landing Page / Contact (Item #5)
const publicChatbotSpec = {
  get: {
    tags: ['Public CMS'],
    summary: 'Pohon Keputusan FAQ Chatbot Bantuan (Publik / Landing Page / Kontak)',
    description: 'Chatbot ditujukan untuk pengunjung baru di landing page atau halaman kontak tanpa perlu autentikasi/login (Item #5 Revisi FE).',
    responses: {
      '200': {
        description: 'Pohon keputusan chatbot berhasil dimuat',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Pohon keputusan chatbot berhasil dimuat' },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      category: { type: 'string', example: 'LAYANAN' },
                      question: { type: 'string', example: 'Layanan apa saja yang disediakan Zhou Consulting?' },
                      answer_template: { type: 'string', example: 'Kami menyediakan Tax Service Core & Kesiapan Coretax, Accounting Service...' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
spec.paths['/api/v1/public/chatbot/tree'] = publicChatbotSpec;
spec.paths['/api/v1/public/chatbot'] = publicChatbotSpec;

// 9. Admin Detail Consultation (GET /api/v1/admin/consultations/{id})
spec.paths['/api/v1/admin/consultations/{id}'] = {
  get: {
    tags: ['Admin'],
    summary: 'Detail Perikatan Konsultasi & Lembar Kerja (Admin PIC & Superadmin)',
    description: 'Menampilkan detail lengkap perikatan konsultasi, checklist penugasan, repositori dokumen dengan signed URL, serta informasi PIC Admin. Admin hanya dapat melihat tiket jika menjadi PIC yang ditugaskan; Superadmin dapat melihat seluruh tiket (Item #14).',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Lembar Kerja Konsultasi',
      },
    ],
    responses: {
      '200': { description: 'Detail konsultasi berhasil dimuat' },
      '403': { description: 'Akses ditolak: Anda bukan PIC yang ditugaskan untuk tiket ini' },
      '404': { description: 'Perikatan tidak ditemukan' },
    },
  },
};

// 10. Assign & Reassign Ticket to PIC Admin (PATCH /api/v1/admin/consultations/{id}/assign)
spec.paths['/api/v1/admin/consultations/{id}/assign'] = {
  patch: {
    tags: ['Admin'],
    summary: 'Superadmin Menugaskan / Mengalihkan PIC Tiket Konsultasi',
    description: 'Superadmin menugaskan tiket ke PIC Admin tertentu dan menyediakan kemampuan mengubah penugasan (reassign) ke PIC Admin lain (Item #13 & #15 Revisi FE). Tindakan dicatat otomatis ke database append-only audit log.',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Lembar Kerja Konsultasi',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              assigned_admin_id: { type: 'integer', example: 2, description: 'ID staf admin yang ditugaskan sebagai PIC' },
            },
            required: ['assigned_admin_id'],
          },
        },
      },
    },
    responses: {
      '200': { description: 'Tiket berhasil ditugaskan / dialihkan ke PIC baru' },
      '400': { description: 'ID admin tidak valid' },
      '403': { description: 'Khusus Superadmin' },
      '404': { description: 'Tiket atau admin tidak ditemukan' },
    },
  },
};

// 11. Superadmin Update Admin (PUT /api/v1/superadmin/admins/{id})
spec.paths['/api/v1/superadmin/admins/{id}'] = {
  put: {
    tags: ['Superadmin'],
    summary: 'Superadmin Memperbarui Akun Staf Admin (Kelola Admin)',
    description: 'Superadmin dapat mengelola admin-admin dengan mengubah nama lengkap, email, nomor telepon, peran (ADMIN/SUPERADMIN), kata sandi, dan status aktif.',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Akun Admin yang diperbarui',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Konsultan Madya Zhou' },
              email: { type: 'string', format: 'email', example: 'konsultan.madya@zhouconsulting.com' },
              phone: { type: 'string', example: '+6281298887766' },
              role: { type: 'string', enum: ['ADMIN', 'SUPERADMIN'], example: 'ADMIN' },
              is_active: { type: 'boolean', example: true },
              password: { type: 'string', example: 'PasswordBaru123!' },
            },
          },
        },
      },
    },
    responses: {
      '200': { description: 'Data staf admin berhasil diperbarui' },
      '403': { description: 'Khusus Superadmin' },
      '404': { description: 'Admin tidak ditemukan' },
    },
  },
};

// 12. Superadmin Reactivate Admin (POST /api/v1/superadmin/admins/{id}/reactivate)
spec.paths['/api/v1/superadmin/admins/{id}/reactivate'] = {
  post: {
    tags: ['Superadmin'],
    summary: 'Superadmin Mengaktifkan Kembali Akun Staf Admin',
    description: 'Mengaktifkan kembali akun staf admin yang sebelumnya dinonaktifkan dan menghapus pencabutan sesi dari Redis blacklist.',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Akun Admin yang diaktifkan kembali',
      },
    ],
    responses: {
      '200': { description: 'Akun staf admin berhasil diaktifkan kembali' },
      '403': { description: 'Khusus Superadmin' },
      '404': { description: 'Admin tidak ditemukan' },
    },
  },
};

// 13. Perbarui Respons Services dengan Card Penjelasan & WhatsApp Button
if (spec.paths['/api/v1/public/services']) {
  spec.paths['/api/v1/public/services'].get.description =
    'Memuat seluruh katalog layanan aktif lengkap dengan card penjelasan yang dikelola dari BE, daftar fitur/cakupan, dan tombol konsultasi yang mengarah langsung ke WhatsApp resmi Zhou Consulting (Item #17 & #18 Revisi FE).';
}

fs.writeFileSync(openApiPath, JSON.stringify(spec, null, 2), 'utf8');
console.log('🎉 Successfully applied FE Revisions to docs/openapi.json! Total Paths:', Object.keys(spec.paths).length);
