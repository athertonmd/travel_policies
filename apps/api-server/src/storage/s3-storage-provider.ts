import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { config } from '../config.js';

export interface StorageResult {
  storage_location: string;
  checksum: string;
}

/**
 * S3 Document Storage Provider.
 * Bucket: tpip-policy-documents
 * Structure: {tenant_id}/{enterprise_id}/{document_id}/{filename}
 */
export class S3StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({ region: config.aws.region });
    this.bucket = config.aws.s3Bucket;
  }

  async upload(key: string, content: Buffer, contentType: string): Promise<StorageResult> {
    const checksum = createHash('sha256').update(content).digest('hex');

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
      Metadata: { checksum },
    }));

    return {
      storage_location: `s3://${this.bucket}/${key}`,
      checksum,
    };
  }

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
