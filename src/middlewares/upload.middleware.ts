import multer from 'multer';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'image/png',
  'image/jpeg',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes (Sesuai PRD Security & Compliance)

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Format berkas tidak didukung. Hanya file PDF, XLSX, DOCX, PNG, dan JPEG yang diizinkan.'
      )
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});
