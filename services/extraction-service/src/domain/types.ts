/**
 * Extraction Service domain types.
 * Project 4: OCR & Document Processing
 */

/** Document processing statuses */
export type ProcessingStatus =
  | 'Uploaded'
  | 'Processing'
  | 'TextExtracted'
  | 'ExtractionFailed'
  | 'Review'
  | 'Approved'
  | 'Rejected';

/** Extracted document text entity — one record per page */
export interface ExtractedDocumentText {
  extracted_text_id: string;
  document_id: string;
  tenant_id: string;
  page_number: number;
  page_text: string;
  extraction_timestamp: string;
  created_at: string;
}

/** Full extraction result for a document */
export interface ExtractionResult {
  document_id: string;
  tenant_id: string;
  pages: ExtractedDocumentText[];
  page_count: number;
  extraction_timestamp: string;
}

/** Document reference from document-service */
export interface DocumentRef {
  document_id: string;
  tenant_id: string;
  enterprise_id: string;
  filename: string;
  content_type: string;
  storage_location: string;
  status: string;
}

/** Textract page result */
export interface TextractPage {
  page_number: number;
  text: string;
}

/** Textract extraction output */
export interface TextractResult {
  pages: TextractPage[];
  page_count: number;
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
