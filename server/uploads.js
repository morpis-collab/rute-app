import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadRoot = process.env.RUTE_UPLOAD_DIR
  ? path.resolve(process.env.RUTE_UPLOAD_DIR)
  : path.join(__dirname, '.data', 'uploads');

const extensionByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function safeExtension(file) {
  const fromMime = extensionByMime[file?.mimetype];
  if (fromMime) return fromMime;

  const ext = path.extname(file?.originalname || '').toLowerCase();
  return /^\.[a-z0-9]+$/.test(ext) ? ext : '.jpg';
}

export function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

export function saveUploadedFile(file, { folder = 'receipts' } = {}) {
  if (!file?.buffer?.length) return null;

  const targetDir = path.join(uploadRoot, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const fileName = [
    Date.now(),
    crypto.randomBytes(6).toString('hex'),
  ].join('-') + safeExtension(file);
  const diskPath = path.join(targetDir, fileName);

  fs.writeFileSync(diskPath, file.buffer);

  return {
    originalFileName: file.originalname || fileName,
    fileName,
    mimeType: file.mimetype || 'application/octet-stream',
    fileSize: file.size || file.buffer.length,
    storagePath: diskPath,
    imageUrl: `/uploads/${folder}/${fileName}`,
  };
}
