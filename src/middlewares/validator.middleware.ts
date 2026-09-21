import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

/**
 * Middleware validasi payload request menggunakan Zod schema.
 * Memastikan payload body sesuai kontrak sebelum diproses oleh controller.
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = (error.issues || []).map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        sendError(res, 400, 'Validasi data input gagal', formattedErrors);
        return;
      }
      sendError(res, 400, 'Format payload request tidak valid');
    }
  };
};
