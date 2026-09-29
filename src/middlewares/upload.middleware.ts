import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { BadRequestError } from '../errors/BadRequestError';

const uploadDir = path.resolve(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedVideoExts = ['.mp4'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedImageExts.includes(ext) || allowedVideoExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Formato file non supportato (${ext}). Estensioni valide: .jpg, .jpeg, .png, .webp, .mp4`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
});
