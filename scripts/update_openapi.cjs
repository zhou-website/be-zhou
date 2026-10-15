const fs = require('fs');
const path = require('path');

const openApiPath = path.resolve(__dirname, '..', 'docs', 'openapi.json');
const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// 1. GET /api/v1/admin/clients
spec.paths['/api/v1/admin/clients'] = {
  get: {
    tags: ['Admin'],
    summary: 'Mendapatkan Daftar Klien (Role USER)',
    description: 'Mengambil seluruh akun pengguna dengan peran USER untuk pilihan dropdown saat pembuatan perikatan konsultasi baru.',
    security: [{ BearerAuth: [] }],
    responses: {
      '200': {
        description: 'Daftar klien berhasil dimuat',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Berhasil memuat daftar klien' },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 3 },
                      name: { type: 'string', example: 'Budi Pratama' },
                      email: { type: 'string', example: 'klien@perusahaan.com' },
                      company_name: { type: 'string', example: 'PT Maju Makmur' },
                      phone: { type: 'string', example: '+6281234567890' },
                      is_active: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '403': { $ref: '#/components/responses/Forbidden' },
    },
  },
};

// 2. POST /api/v1/client/consultations/{id}/documents
spec.paths['/api/v1/client/consultations/{id}/documents'] = {
  post: {
    tags: ['Client'],
    summary: 'Unggah Berkas/Dokumen Kerja oleh Klien',
    description: 'Klien mengunggah dokumen (PDF, XLSX, DOCX) langsung ke lembar kerja konsultasi mereka. Berkas disimpan ke Supabase Storage.',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Lembar Kerja Konsultasi Klien',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary', description: 'Berkas dokumen (Maks 5MB)' },
              file_name: { type: 'string', example: 'Laporan_Keuangan_Klien.pdf' },
            },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Dokumen berhasil diunggah oleh klien',
      },
      '400': { $ref: '#/components/responses/BadRequest' },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '404': { $ref: '#/components/responses/NotFound' },
    },
  },
};

// 3. PUT & DELETE /api/v1/admin/cms/services/{id}
spec.paths['/api/v1/admin/cms/services/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Layanan Konsultasi',
    description: 'Memperbarui data katalog layanan (Accounting, Tax Core, Legal, dsb).',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              service_code: { type: 'string', example: 'TAX-001' },
              service_name: { type: 'string', example: 'Tax Compliance & Filing' },
              category: { type: 'string', example: 'Tax Service Core' },
              description: { type: 'string', example: 'Layanan kepatuhan SPT tahunan dan masa' },
              is_active: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Layanan berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus Layanan Konsultasi',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Layanan berhasil dihapus' } },
  },
};

// 4. PUT & DELETE /api/v1/admin/cms/tax-rates/{id}
spec.paths['/api/v1/admin/cms/tax-rates/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Kurs Pajak Mingguan',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              currency_code: { type: 'string', example: 'USD' },
              rate_value: { type: 'number', example: 15850.5 },
              effective_start_date: { type: 'string', format: 'date', example: '2026-09-25' },
              effective_end_date: { type: 'string', format: 'date', example: '2026-10-01' },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Kurs pajak berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus Kurs Pajak Mingguan',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Kurs pajak berhasil dihapus' } },
  },
};

// 5. PUT & DELETE /api/v1/admin/cms/regulations/{id}
spec.paths['/api/v1/admin/cms/regulations/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Dokumen Regulasi Pajak',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'PMK No. 48/PMK.03/2026' },
              regulation_type: { type: 'string', example: 'Peraturan Menteri Keuangan' },
              file_path: { type: 'string', example: 'documents/regulasi_pmk48.pdf' },
              file_size: { type: 'string', example: '1.2 MB' },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Regulasi berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus Dokumen Regulasi Pajak',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Regulasi berhasil dihapus' } },
  },
};

// 6. PUT & DELETE /api/v1/admin/cms/education/{id}
spec.paths['/api/v1/admin/cms/education/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Materi Edukasi / Artikel Pajak',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Panduan Praktis SPT Badan 2026' },
              category: { type: 'string', example: 'PPh Badan' },
              content_type: { type: 'string', example: 'ARTICLE' },
              body: { type: 'string', example: 'Isi artikel edukasi...' },
              file_path: { type: 'string', example: 'documents/guide_spt.pdf' },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Materi edukasi berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus Materi Edukasi / Artikel Pajak',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Materi edukasi berhasil dihapus' } },
  },
};

// 7. PUT & DELETE /api/v1/admin/cms/careers/{id}
spec.paths['/api/v1/admin/cms/careers/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Lowongan Karir',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              position_code: { type: 'string', example: 'TAX-SPEC-01' },
              position_title: { type: 'string', example: 'Senior Tax Consultant' },
              level: { type: 'string', example: 'Senior' },
              location: { type: 'string', example: 'Jakarta Selatan (Hybrid)' },
              description: { type: 'string', example: 'Deskripsi pekerjaan...' },
              is_active: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Lowongan kerja berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus Lowongan Karir',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Lowongan kerja berhasil dihapus' } },
  },
};

// 8. /api/v1/admin/cms/faqs
spec.paths['/api/v1/admin/cms/faqs'] = {
  get: {
    tags: ['CMS Admin'],
    summary: 'Daftar FAQ Chatbot (Admin)',
    description: 'Mengambil seluruh basis pengetahuan pohon keputusan chatbot untuk pengelolaan CMS admin.',
    security: [{ BearerAuth: [] }],
    responses: { '200': { description: 'Daftar FAQ berhasil dimuat' } },
  },
  post: {
    tags: ['CMS Admin'],
    summary: 'Tambah FAQ Chatbot Baru',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['category', 'question', 'answer_template'],
            properties: {
              category: { type: 'string', example: 'Tax' },
              question: { type: 'string', example: 'Bagaimana cara perhitungan PPh 21 terbaru?' },
              answer_template: { type: 'string', example: 'Perhitungan PPh 21 menggunakan tarif efektif rata-rata (TER)...' },
            },
          },
        },
      },
    },
    responses: { '201': { description: 'FAQ chatbot berhasil ditambahkan' } },
  },
};

// 9. PUT & DELETE /api/v1/admin/cms/faqs/{id}
spec.paths['/api/v1/admin/cms/faqs/{id}'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui FAQ Chatbot',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              category: { type: 'string', example: 'Accounting' },
              question: { type: 'string', example: 'Pertanyaan baru...' },
              answer_template: { type: 'string', example: 'Template jawaban baru...' },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'FAQ chatbot berhasil diperbarui' } },
  },
  delete: {
    tags: ['CMS Admin'],
    summary: 'Hapus FAQ Chatbot',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'FAQ chatbot berhasil dihapus' } },
  },
};

// 10. PUT /api/v1/admin/cms/settings/contact
spec.paths['/api/v1/admin/cms/settings/contact'] = {
  put: {
    tags: ['CMS Admin'],
    summary: 'Perbarui Pengaturan Kontak & WhatsApp CS',
    description: 'Admin memperbarui informasi nomor WhatsApp CS, email, dan alamat kantor Zhou Consulting.',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              whatsapp: { type: 'string', example: '+6281123456789' },
              email: { type: 'string', example: 'cs@zhouconsulting.com' },
              address: { type: 'string', example: 'Kuningan, Jakarta Selatan' },
              phone: { type: 'string', example: '+62215551234' },
            },
          },
        },
      },
    },
    responses: { '200': { description: 'Pengaturan kontak berhasil diperbarui' } },
  },
};

// 11. /api/v1/user/sessions
spec.paths['/api/v1/user/sessions'] = {
  get: {
    tags: ['User'],
    summary: 'Daftar Sesi Pengguna Aktif',
    description: 'Mengambil informasi sesi aktif pengguna saat ini (IP, User-Agent, device).',
    security: [{ BearerAuth: [] }],
    responses: { '200': { description: 'Daftar sesi berhasil dimuat' } },
  },
};

// 12. DELETE /api/v1/user/sessions/{id}
spec.paths['/api/v1/user/sessions/{id}'] = {
  delete: {
    tags: ['User'],
    summary: 'Hentikan / Cabut Sesi Pengguna',
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: { '200': { description: 'Sesi berhasil dihentikan' } },
  },
};

// 13. GET /api/v1/public/careers & /api/v1/careers
const careerGetSpec = {
  get: {
    tags: ['Public'],
    summary: 'Daftar Lowongan Karir Aktif',
    description: 'Mengambil lowongan pekerjaan aktif beserta informasi format berkas yang diperbolehkan (PDF, DOCX, DOC maks 5MB).',
    responses: {
      '200': {
        description: 'Daftar lowongan kerja berhasil dimuat',
      },
    },
  },
};
spec.paths['/api/v1/public/careers'] = careerGetSpec;
spec.paths['/api/v1/careers'] = careerGetSpec;

// 14. GET /api/v1/public/careers/{id} & /api/v1/careers/{id}
const careerDetailSpec = {
  get: {
    tags: ['Public'],
    summary: 'Detail Lowongan Karir',
    description: 'Mengambil rincian lowongan pekerjaan berdasarkan ID beserta ketentuan unggah berkas CV.',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      '200': { description: 'Detail lowongan berhasil dimuat' },
      '404': { description: 'Lowongan tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/careers/{id}'] = careerDetailSpec;
spec.paths['/api/v1/careers/{id}'] = careerDetailSpec;

// 15. POST /api/v1/public/careers/{id}/apply & /api/v1/careers/{id}/apply
const careerApplySpec = {
  post: {
    tags: ['Public'],
    summary: 'Kirim Lamaran Kerja & Unggah CV Pelamar',
    description: 'Pelamar memasukkan biodata diri dan memilih berkas CV (PDF, DOCX, DOC). Berkas otomatis diunggah ke Supabase Storage, tersimpan ke PostgreSQL, dan dikonfirmasi via email Resend.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID Lowongan Karir yang dilamar',
      },
    ],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['applicant_name', 'applicant_email'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'Pilih Berkas CV/Resume (Select File: PDF, DOCX, DOC - Maksimal 5MB)',
              },
              file_type: {
                type: 'string',
                enum: ['PDF', 'DOCX', 'DOC'],
                example: 'PDF',
                description: 'Pilihan jenis berkas CV yang diunggah (select file type)',
              },
              applicant_name: {
                type: 'string',
                example: 'Ahmad Fauzi',
                description: 'Nama lengkap pelamar',
              },
              applicant_email: {
                type: 'string',
                example: 'ahmad.fauzi@gmail.com',
                description: 'Alamat email pelamar',
              },
              applicant_phone: {
                type: 'string',
                example: '+6281234567890',
                description: 'Nomor telepon/WhatsApp pelamar',
              },
              cv_file_path: {
                type: 'string',
                example: 'cvs/1791361961730_CV_Ahmad.pdf',
                description: 'Path berkas jika CV sudah diunggah sebelumnya (opsional jika memilih file)',
              },
            },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Lamaran kerja berhasil dikirimkan dan berkas CV tersimpan di Supabase Storage',
      },
      '400': { description: 'Biodata tidak lengkap atau berkas CV belum dipilih' },
      '404': { description: 'Lowongan kerja tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/careers/{id}/apply'] = careerApplySpec;
spec.paths['/api/v1/careers/{id}/apply'] = careerApplySpec;

// 16. POST /api/v1/public/upload & /api/v1/upload
const uploadPublicSpec = {
  post: {
    tags: ['Public'],
    summary: 'Unggah Berkas Publik ke Supabase Storage',
    description: 'Helper endpoint untuk mengunggah berkas mandiri ke Supabase Storage dan memperoleh signed URL serta file_path.',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'Pilih Berkas yang diunggah (PDF, DOCX, XLS, PNG, JPEG, maks 5MB)',
              },
              folder: {
                type: 'string',
                example: 'cvs',
                description: 'Folder tujuan penyimpanan (cvs, documents, avatars, dll)',
              },
            },
          },
        },
      },
    },
    responses: {
      '201': { description: 'Berkas berhasil diunggah ke storage' },
      '400': { description: 'Berkas belum dipilih atau ukuran melebihi batas' },
    },
  },
};
spec.paths['/api/v1/public/upload'] = uploadPublicSpec;
spec.paths['/api/v1/upload'] = uploadPublicSpec;

// 17. GET /api/v1/admin/cms/job-applications
spec.paths['/api/v1/admin/cms/job-applications'] = {
  get: {
    tags: ['CMS Admin'],
    summary: 'Daftar Lamaran Kerja Masuk & Tautan CV',
    description: 'Admin meninjau pelamar kerja beserta signed URL untuk mengunduh berkas CV langsung dari Supabase Storage.',
    security: [{ BearerAuth: [] }],
    responses: {
      '200': { description: 'Daftar lamaran kerja berhasil dimuat' },
    },
  },
};

// 18. GET /api/v1/admin/cms/job-applications/{id}/download
spec.paths['/api/v1/admin/cms/job-applications/{id}/download'] = {
  get: {
    tags: ['CMS Admin'],
    summary: 'Unduh Berkas CV Pelamar Kerja (Signed URL Supabase)',
    description: 'Menghasilkan tautan unduh berbatas waktu (signed URL 1 jam) dari Supabase Storage untuk berkas CV pelamar tertentu.',
    security: [{ BearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID data lamaran kerja (job_application id)',
      },
    ],
    responses: {
      '200': { description: 'Signed URL CV pelamar berhasil digenerate' },
      '404': { description: 'Berkas CV atau lamaran tidak ditemukan' },
    },
  },
};

// 19. Education Detail & Download
const eduDetailSpec = {
  get: {
    tags: ['Public'],
    summary: 'Detail Konten Edukasi Perpajakan',
    description: 'Mengambil detail artikel atau materi panduan edukasi pajak beserta tautan berkas dari Supabase Storage.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID konten edukasi',
      },
    ],
    responses: {
      '200': { description: 'Detail edukasi berhasil dimuat' },
      '404': { description: 'Materi edukasi tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/education/{id}'] = eduDetailSpec;
spec.paths['/api/v1/education/{id}'] = eduDetailSpec;

const eduDownloadSpec = {
  get: {
    tags: ['Public'],
    summary: 'Unduh Berkas Materi Panduan Edukasi (Signed URL)',
    description: 'Mendapatkan signed URL Supabase Storage berbatas waktu untuk mengunduh lampiran materi/panduan edukasi.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID konten edukasi',
      },
    ],
    responses: {
      '200': { description: 'Tautan unduh berkas edukasi berhasil dibuat' },
      '404': { description: 'Berkas materi edukasi tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/education/{id}/download'] = eduDownloadSpec;
spec.paths['/api/v1/education/{id}/download'] = eduDownloadSpec;

// 20. Regulation Detail & Download
const regDetailSpec = {
  get: {
    tags: ['Public'],
    summary: 'Detail Regulasi Perpajakan',
    description: 'Mengambil informasi lengkap regulasi beserta tautan berkas resmi perpajakan dari Supabase Storage.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID regulasi pajak',
      },
    ],
    responses: {
      '200': { description: 'Detail regulasi berhasil dimuat' },
      '404': { description: 'Dokumen regulasi tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/regulations/{id}'] = regDetailSpec;
spec.paths['/api/v1/regulations/{id}'] = regDetailSpec;

const regDownloadSpec = {
  get: {
    tags: ['Public'],
    summary: 'Unduh Berkas Regulasi Pajak (Signed URL)',
    description: 'Mendapatkan signed URL Supabase Storage berbatas waktu untuk mengunduh salinan berkas resmi regulasi pajak.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'ID regulasi pajak',
      },
    ],
    responses: {
      '200': { description: 'Tautan unduh regulasi berhasil digenerate' },
      '404': { description: 'Berkas regulasi tidak ditemukan' },
    },
  },
};
spec.paths['/api/v1/public/regulations/{id}/download'] = regDownloadSpec;
spec.paths['/api/v1/regulations/{id}/download'] = regDownloadSpec;

// 18. POST /api/v1/client/consultations
spec.paths['/api/v1/client/consultations'] = {
  get: spec.paths['/api/v1/client/consultations']?.get || {
    tags: ['Client'],
    summary: 'Daftar Perikatan Konsultasi Klien',
    description: 'Mengambil riwayat seluruh perikatan konsultasi milik klien yang sedang login.',
    security: [{ BearerAuth: [] }],
    responses: {
      '200': { description: 'Daftar perikatan konsultasi berhasil dimuat' },
    },
  },
  post: {
    tags: ['Client'],
    summary: 'Permohonan Konsultasi Baru (Klien)',
    description: 'Klien mengirimkan formulir permohonan konsultasi baru beserta opsi unggah dokumen pendukung awal. Data otomatis tercatat di sistem konsultasi operasional.',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string', example: 'Penyusunan SPT Tahunan Badan & Ekualisasi PPh/PPN' },
              description: { type: 'string', example: 'Mohon pendampingan telaah rekonsiliasi fiskal dan pelaporan SPT Tahunan Badan.' },
              category: { type: 'string', example: 'Tax Service Core' },
              service_id: { type: 'integer', example: 1 },
              urgency: { type: 'string', enum: ['Normal', 'Tinggi', 'Mendesak'], example: 'Normal' },
              file: { type: 'string', format: 'binary', description: 'Berkas pendukung awal (PDF, XLSX, DOCX)' },
            },
          },
        },
        'application/json': {
          schema: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string', example: 'Penyusunan SPT Tahunan Badan & Ekualisasi PPh/PPN' },
              description: { type: 'string', example: 'Mohon pendampingan telaah rekonsiliasi fiskal dan pelaporan SPT Tahunan Badan.' },
              category: { type: 'string', example: 'Tax Service Core' },
              service_id: { type: 'integer', example: 1 },
              urgency: { type: 'string', enum: ['Normal', 'Tinggi', 'Mendesak'], example: 'Normal' },
            },
          },
        },
      },
    },
    responses: {
      '201': { description: 'Permohonan konsultasi baru berhasil dibuat dan diteruskan ke antrean penugasan' },
      '400': { description: 'Data masukan tidak lengkap atau tidak valid' },
      '401': { $ref: '#/components/responses/Unauthorized' },
    },
  },
};

// 19. POST /api/v1/public/consultations
spec.paths['/api/v1/public/consultations'] = {
  post: {
    tags: ['Public CMS'],
    summary: 'Permohonan Konsultasi Publik / Guest',
    description: 'Pengunjung publik mengajukan permohonan konsultasi dari halaman kontak/layanan tanpa perlu login terlebih dahulu.',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'title'],
            properties: {
              name: { type: 'string', example: 'Budi Santoso' },
              email: { type: 'string', example: 'budi@ptmaju.co.id' },
              phone: { type: 'string', example: '+6281234567890' },
              company_name: { type: 'string', example: 'PT Maju Terus' },
              title: { type: 'string', example: 'Konsultasi Perencanaan Pajak Korporasi' },
              description: { type: 'string', example: 'Ingin berdiskusi terkait kepatuhan integrasi Coretax dan ekualisasi PPh.' },
              category: { type: 'string', example: 'Tax Service Core' },
              urgency: { type: 'string', enum: ['Normal', 'Tinggi', 'Mendesak'], example: 'Normal' },
              file: { type: 'string', format: 'binary', description: 'Berkas pendukung permohonan' },
            },
          },
        },
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'title'],
            properties: {
              name: { type: 'string', example: 'Budi Santoso' },
              email: { type: 'string', example: 'budi@ptmaju.co.id' },
              phone: { type: 'string', example: '+6281234567890' },
              company_name: { type: 'string', example: 'PT Maju Terus' },
              title: { type: 'string', example: 'Konsultasi Perencanaan Pajak Korporasi' },
              description: { type: 'string', example: 'Ingin berdiskusi terkait kepatuhan integrasi Coretax dan ekualisasi PPh.' },
              category: { type: 'string', example: 'Tax Service Core' },
              urgency: { type: 'string', enum: ['Normal', 'Tinggi', 'Mendesak'], example: 'Normal' },
            },
          },
        },
      },
    },
    responses: {
      '201': { description: 'Permohonan konsultasi berhasil dikirim dan terdaftar di Zhou Consulting' },
      '400': { description: 'Nama, email, dan kebutuhan permohonan konsultasi wajib diisi' },
    },
  },
};

fs.writeFileSync(openApiPath, JSON.stringify(spec, null, 2), 'utf8');
console.log('✅ Successfully updated docs/openapi.json with all new endpoints! Total paths:', Object.keys(spec.paths).length);

