import { z } from 'zod';

export const createConsultationSchema = z.object({
  project_code: z.string().min(3, 'Kode proyek minimal 3 karakter'),
  client_id: z.number().int().positive('ID klien tidak valid'),
  service_id: z.number().int().positive('ID layanan tidak valid'),
  title: z.string().min(3, 'Judul perikatan minimal 3 karakter'),
  description: z.string().optional().nullable(),
  initial_tasks: z.array(z.string()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']),
});

export const addTaskSchema = z
  .object({
    task_name: z.string().optional(),
    title: z.string().optional(),
  })
  .refine((data) => data.task_name || data.title, {
    message: 'Nama tugas checklist wajib diisi',
  })
  .transform((data) => ({
    ...data,
    task_name: data.task_name || data.title,
  }));

export const toggleTaskSchema = z.object({
  is_completed: z.boolean().optional(),
});
