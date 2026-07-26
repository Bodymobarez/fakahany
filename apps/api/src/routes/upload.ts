import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import { storage } from '../lib/storage';
import { AppError } from '../middleware/error';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const uploadRouter = Router();

uploadRouter.post(
  '/',
  authenticate,
  requireRoles('ADMIN', 'STAFF', 'DRIVER'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, 'File required', 'FILE_REQUIRED');
      const isImage = req.file.mimetype.startsWith('image/');
      const saved = isImage
        ? await storage.saveImage(req.file.buffer, req.file.originalname, { maxWidth: 1600 })
        : await storage.saveBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.status(201).json({ file: saved });
    } catch (err) {
      next(err);
    }
  },
);

const dataUrlSchema = z.object({
  dataUrl: z.string().min(32).max(6_000_000),
  filename: z.string().max(120).optional(),
});

uploadRouter.post('/data-url', authenticate, requireRoles('ADMIN', 'STAFF', 'DRIVER'), async (req, res, next) => {
  try {
    const body = dataUrlSchema.parse(req.body);
    const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(body.dataUrl);
    if (!match) throw new AppError(400, 'Invalid data URL', 'INVALID_DATA_URL');
    const mime = match[1]!;
    const buf = Buffer.from(match[2]!, 'base64');
    if (buf.length > 8 * 1024 * 1024) throw new AppError(400, 'File too large', 'FILE_TOO_LARGE');
    const ext = mime.includes('png')
      ? '.png'
      : mime.includes('svg')
        ? '.svg'
        : mime.includes('webp')
          ? '.webp'
          : '.jpg';
    const name = body.filename || `upload${ext}`;
    const saved =
      mime.startsWith('image/') && !mime.includes('svg')
        ? await storage.saveImage(buf, name, { maxWidth: 1600 })
        : await storage.saveBuffer(buf, name, mime);
    res.status(201).json({ file: saved });
  } catch (err) {
    next(err);
  }
});
