/**
 * Document Service domain types.
 * Based on docs/steering/03-data-model-specification.md
 */

/** Policy document statuses */
export type DocumentStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Review'
  | 'Approved'
  | 'Rejected'
  | 'Archived';

/** Supported content types (PRD: PDF + DOCX) */
export type SupportedContentType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Policy document entity */
export interface PolicyDocumentEntity {
  document_id: string;
  tenant_id: string;
  enterprise_id: string;
  version_number: number;
  filename: string;
  content_type: SupportedContentType;
  file_size: number;
  storage_location: string;
  uploaded_by: string;
  uploaded_at: string;
  status: DocumentStatus;
  checksum: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Upload document request */
export interface UploadDocumentRequest {
  filename: string;
  content_type: string;
  file_size: number;
  file_content: Buffer;
}

/** Upload result */
export interface UploadDocumentResponse {
  document_id: string;
  version_number: number;
  upload_status: 'Uploaded';
}

/** Caller context for authorization */
export interface CallerContext {
  user_id: string;
  tenant_id: string;
  role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';
}

/** Audit log entry */
export interface AuditEntry {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}

/** Enterprise lookup result (minimal) */
export interface EnterpriseRef {
  enterprise_id: string;
  tenant_id: string;
  status: string;
}
