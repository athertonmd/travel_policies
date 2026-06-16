import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../../config.js';

export interface DocumentRecord {
  document_id: string;
  tenant_id: string;
  enterprise_id: string;
  version_number: number;
  filename: string;
  content_type: string;
  file_size: number;
  storage_location: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  checksum: string;
}

/**
 * Local JSON-file-based document repository.
 * Stores documents metadata in .tpip-data/db/documents.json
 * No PostgreSQL or Docker required.
 */
export class LocalDocumentRepository {
  private dbPath: string;

  constructor() {
    const dbDir = join(config.localDataDir, 'db');
    mkdirSync(dbDir, { recursive: true });
    this.dbPath = join(dbDir, 'documents.json');
    if (!existsSync(this.dbPath)) {
      writeFileSync(this.dbPath, '[]');
    }
  }

  private readAll(): DocumentRecord[] {
    return JSON.parse(readFileSync(this.dbPath, 'utf-8'));
  }

  private writeAll(docs: DocumentRecord[]): void {
    writeFileSync(this.dbPath, JSON.stringify(docs, null, 2));
  }

  async create(doc: DocumentRecord): Promise<DocumentRecord> {
    const docs = this.readAll();
    docs.push(doc);
    this.writeAll(docs);
    return doc;
  }

  async findById(documentId: string): Promise<DocumentRecord | null> {
    return this.readAll().find((d) => d.document_id === documentId) ?? null;
  }

  async findByEnterprise(enterpriseId: string): Promise<DocumentRecord[]> {
    return this.readAll()
      .filter((d) => d.enterprise_id === enterpriseId)
      .sort((a, b) => b.version_number - a.version_number);
  }

  async getLatestVersionNumber(enterpriseId: string): Promise<number> {
    const docs = this.readAll().filter((d) => d.enterprise_id === enterpriseId);
    if (docs.length === 0) return 0;
    return Math.max(...docs.map((d) => d.version_number));
  }

  async updateStatus(documentId: string, status: string): Promise<void> {
    const docs = this.readAll();
    const idx = docs.findIndex((d) => d.document_id === documentId);
    if (idx >= 0) {
      docs[idx].status = status;
      this.writeAll(docs);
    }
  }
}
