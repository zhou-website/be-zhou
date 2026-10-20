import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC (Word 97-2003)
  'application/vnd.ms-powerpoint', // PPT
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'text/csv', // CSV
  'text/plain', // TXT
  'application/zip', // ZIP
  'application/x-zip-compressed', // ZIP
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.ppt',
  '.pptx',
  '.csv',
  '.txt',
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes (Maksimal fleksibel untuk berkas materi edukasi & CV)

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Format berkas tidak didukung. Format yang didukung: PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS, CSV, TXT, ZIP, PNG, JPEG, WEBP, dan SVG (Maksimal 10MB).'
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

// Middleware fleksibel yang menerima berkas dari nama field apapun tanpa melempar error MulterError: Unexpected field
export const flexibleUploadMiddleware = uploadMiddleware.any();

// Middleware khusus CV pelamar karir (fleksibel)
export const careerCvUploadMiddleware = uploadMiddleware.any();

// Middleware dokumen konsultasi perikatan (fleksibel)
export const consultationDocUploadMiddleware = uploadMiddleware.any();

// Middleware unggah avatar profil (fleksibel)
export const avatarUploadMiddleware = uploadMiddleware.any();

// Helper universal untuk mengekstrak file dari request tanpa bergantung pada satu nama field
export const getUploadedFile = (req: Request): Express.Multer.File | undefined => {
  if (req.file) return req.file;

  const files = req.files;
  if (!files) return undefined;

  if (Array.isArray(files) && files.length > 0) {
    return files[0];
  }

  if (typeof files === 'object') {
    const fileMap = files as Record<string, Express.Multer.File[]>;
    return (
      fileMap.file?.[0] ||
      fileMap.cv?.[0] ||
      fileMap.cv_file?.[0] ||
      fileMap.cvFile?.[0] ||
      fileMap.resume?.[0] ||
      fileMap.document?.[0] ||
      fileMap.attachment?.[0] ||
      fileMap.image?.[0] ||
      fileMap.thumbnail?.[0] ||
      fileMap.cover?.[0] ||
      fileMap.avatar?.[0] ||
      Object.values(fileMap)[0]?.[0]
    );
  }

  return undefined;
};

