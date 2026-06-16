import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { config } from '../config.js';

export interface StorageResult {
  storage_location: string;
  checksum: string;
}

/**
 * Local file-based storage provider.
 * Stores documents on the local filesystem for development without S3/Docker.
 * Structure: .tpip-data/documents/{key}
 */
export class LocalStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = join(config.localDataDir, 'documents');
    mkdirSync(this.baseDir, { recursive: true });
  }

  async upload(key: string, content: Buffer, _contentType: string): Promise<StorageResult> {
    const checksum = createHash('sha256').update(content).digest('hex');
    const filePath = join(this.baseDir, key);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
    return {
      storage_location: `local://${filePath}`,
      checksum,
    };
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `file://${join(this.baseDir, key)}`;
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(join(this.baseDir, key));
  }

  getContent(key: string): Buffer | null {
    const filePath = join(this.baseDir, key);
    return existsSync(filePath) ? readFileSync(filePath) : null;
  }
}
