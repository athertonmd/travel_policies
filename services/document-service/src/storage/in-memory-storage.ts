import { createHash } from 'crypto';
import { StorageProvider, StorageMetadata, StorageResult } from './storage-provider';

/**
 * In-memory storage provider for testing.
 * Simulates S3 behaviour without AWS dependencies.
 */
export class InMemoryStorageProvider implements StorageProvider {
  private store = new Map<string, { content: Buffer; metadata: StorageMetadata }>();

  async upload(key: string, content: Buffer, metadata: StorageMetadata): Promise<StorageResult> {
    const checksum = createHash('sha256').update(content).digest('hex');
    this.store.set(key, { content, metadata: { ...metadata, checksum } });
    return {
      storage_location: `s3://policy-documents/${key}`,
      checksum,
    };
  }

  async getDownloadUrl(key: string): Promise<string> {
    if (!this.store.has(key)) {
      throw new Error(`Object not found: ${key}`);
    }
    return `https://policy-documents.s3.amazonaws.com/${key}?presigned=true`;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  /** Test helper: get stored content */
  getContent(key: string): Buffer | undefined {
    return this.store.get(key)?.content;
  }

  clear(): void {
    this.store.clear();
  }
}
