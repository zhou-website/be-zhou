import { z } from 'zod';

const passwordComplexityRegex = /^(?=.*[A-Z])(?=.*\d)/;
const passwordErrorMessage = 'Password minimal 8 karakter dengan 1 huruf besar dan 1 angka';

export const createAdminSchema = z.object({
  name: z.string().trim().min(1, 'Nama lengkap wajib diisi'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid (contoh: staf@zhouconsulting.com)'),
  password: z
    .string()
    .min(1, 'Kata sandi awal wajib diisi')
    .min(8, passwordErrorMessage)
    .regex(passwordComplexityRegex, passwordErrorMessage),
  role: z.enum(['ADMIN', 'SUPERADMIN']).optional().default('ADMIN'),
  phone: z.string().optional().nullable(),
});

export const updateAdminSchema = z.object({
  name: z.string().trim().min(1, 'Nama lengkap staf tidak boleh kosong').optional(),
  email: z.string().trim().email('Format email tidak valid (contoh: staf@zhouconsulting.com)').optional(),
  role: z.enum(['ADMIN', 'SUPERADMIN']).optional(),
  phone: z.string().optional().nullable(),
  password: z
    .string()
    .min(8, passwordErrorMessage)
    .regex(passwordComplexityRegex, passwordErrorMessage)
    .optional(),
  new_password: z
    .string()
    .min(8, passwordErrorMessage)
    .regex(passwordComplexityRegex, passwordErrorMessage)
    .optional(),
  is_active: z.boolean().optional(),
  status: z.string().optional(),
});

export const resetAdminPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, passwordErrorMessage)
      .regex(passwordComplexityRegex, passwordErrorMessage)
      .optional(),
    new_password: z
      .string()
      .min(8, passwordErrorMessage)
      .regex(passwordComplexityRegex, passwordErrorMessage)
      .optional(),
  })
  .refine((data) => data.password || data.new_password, {
    message: 'Kata sandi baru wajib disertakan',
    path: ['password'],
  });
