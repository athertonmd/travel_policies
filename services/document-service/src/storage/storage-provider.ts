/**
 * Storage provider interface for document storage (ADR-003: S3).
 * In production, this integrates with Amazon S3.
 * Bucket: policy-documents
 */

export interface StorageMetadata {
  content_type: string;
  file_size: number;
  checksum: string;
  enterprise_id: string;
  version_number: number;
}

export interface StorageResult {
  storage_location: string;
  checksum: string;
}

export interface StorageProvider {
  /** Upload a file to storage */
  upload(
    key: string,
    content: Buffer,
    metadata: StorageMetadata,
  ): Promise<StorageResult>;

  /** Generate a pre-signed download URL */
  getDownloadUrl(key: string): Promise<string>;

  /** Check if an object exists */
  exists(key: string): Promise<boolean>;
}
