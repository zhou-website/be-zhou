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
  is_completed: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === 'string') return val === 'true' || val === '1';
      return Boolean(val);
    }),
  completed: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === 'string') return val === 'true' || val === '1';
      return Boolean(val);
    }),
});

export const updateTasksBatchSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]).optional(),
        task_name: z.string().optional(),
        is_completed: z
          .union([z.boolean(), z.string()])
          .optional()
          .transform((val) => {
            if (val === undefined) return undefined;
            if (typeof val === 'string') return val === 'true' || val === '1';
            return Boolean(val);
          }),
      })
    )
    .optional(),
  milestones: z.array(z.any()).optional(),
  progress_percent: z.number().min(0).max(100).optional(),
});
