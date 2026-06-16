import { getPool } from './pg-client.js';

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

export class PgDocumentRepository {
  async create(doc: DocumentRecord): Promise<DocumentRecord> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO policy_documents (document_id, tenant_id, enterprise_id, version_number, filename, content_type, file_size, storage_location, uploaded_by, upload_date, status, checksum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [doc.document_id, doc.tenant_id, doc.enterprise_id, doc.version_number, doc.filename, doc.content_type, doc.file_size, doc.storage_location, doc.uploaded_by, doc.uploaded_at, doc.status, doc.checksum],
    );
    return doc;
  }

  async findById(documentId: string): Promise<DocumentRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM policy_documents WHERE document_id = $1', [documentId]);
    return result.rows[0] ?? null;
  }

  async findByEnterprise(enterpriseId: string): Promise<DocumentRecord[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM policy_documents WHERE enterprise_id = $1 ORDER BY version_number DESC', [enterpriseId]);
    return result.rows;
  }

  async getLatestVersionNumber(enterpriseId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query('SELECT MAX(version_number) as max_version FROM policy_documents WHERE enterprise_id = $1', [enterpriseId]);
    return result.rows[0]?.max_version ?? 0;
  }

  async updateStatus(documentId: string, status: string): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE policy_documents SET status = $1, updated_at = NOW() WHERE document_id = $2', [status, documentId]);
  }
}
