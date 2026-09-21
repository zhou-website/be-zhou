import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  phone: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token reset kata sandi wajib disertakan'),
  password: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
});

export const googleLoginSchema = z
  .object({
    token: z.string().optional(),
    id_token: z.string().optional(),
    email: z.string().email('Format email tidak valid').optional(),
    name: z.string().optional(),
  })
  .refine((data) => data.token || data.id_token || data.email, {
    message: 'Sediakan id_token atau email untuk otentikasi Google OAuth',
  });
