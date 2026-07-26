import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export interface StoredFile {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export class LocalStorage {
  private root: string;

  constructor(root = process.env.UPLOAD_DIR || './uploads') {
    this.root = path.isAbsolute(root) ? root : path.resolve(process.cwd(), root);
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async saveImage(buffer: Buffer, originalName: string, opts?: { maxWidth?: number }): Promise<StoredFile> {
    await this.ensureReady();
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext === '.png' ? '.png' : '.webp'}`;
    const abs = path.join(this.root, filename);

    let pipeline = sharp(buffer).rotate();
    if (opts?.maxWidth) {
      pipeline = pipeline.resize({ width: opts.maxWidth, withoutEnlargement: true });
    }
    const out =
      ext === '.png'
        ? await pipeline.png({ quality: 85 }).toBuffer()
        : await pipeline.webp({ quality: 82 }).toBuffer();

    await fs.writeFile(abs, out);

    return {
      url: `/uploads/${filename}`,
      filename,
      mimeType: ext === '.png' ? 'image/png' : 'image/webp',
      size: out.length,
    };
  }

  async saveBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile> {
    await this.ensureReady();
    const ext = path.extname(originalName) || '';
    const filename = `${randomUUID()}${ext}`;
    const abs = path.join(this.root, filename);
    await fs.writeFile(abs, buffer);
    return {
      url: `/uploads/${filename}`,
      filename,
      mimeType,
      size: buffer.length,
    };
  }

  resolvePath(filename: string): string {
    return path.join(this.root, filename);
  }
}

export const storage = new LocalStorage();
