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

fs.writeFileSync(openApiPath, JSON.stringify(spec, null, 2), 'utf8');
console.log('✅ Successfully updated docs/openapi.json with all new endpoints! Total paths:', Object.keys(spec.paths).length);
