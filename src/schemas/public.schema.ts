import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  message: z.string().min(1, 'Pesan wajib diisi'),
});
