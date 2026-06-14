import { v4 as uuidv4 } from 'uuid';
import {
  ExtractedDocumentText,
  ExtractionResult,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { NotFoundError, ForbiddenError, ExtractionError } from '../domain/errors';
import { ExtractedTextRepository } from '../repositories/extracted-text-repository';
import { DocumentLookup } from '../repositories/document-lookup';
import { AuditRepository } from '../repositories/audit-repository';
import { TextractProvider } from '../textract/textract-provider';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * Document Processing Service — manages OCR text extraction pipeline.
 *
 * Responsibilities:
 * - Retrieve uploaded document metadata
 * - Determine document type (PDF/DOCX)
 * - Extract text via Textract
 * - Store extracted text per page
 * - Track extraction status
 * - Emit lifecycle events
 *
 * Enforces:
 * - BR-008: Original extracted text always retained
 * - BR-042: Cross-tenant access prohibition
 * - BR-043: Audit logging
 */
export class DocumentProcessingService {
  constructor(
    private readonly extractedTextRepo: ExtractedTextRepository,
    private readonly documentLookup: DocumentLookup,
    private readonly auditRepo: AuditRepository,
    private readonly textract: TextractProvider,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Process a document: extract text via Textract and store results.
   * Transitions: Uploaded → Processing → TextExtracted (or ExtractionFailed)
   */
  async processDocument(documentId: string, caller: CallerContext): Promise<ExtractionResult> {
    // Retrieve document
    const document = await this.documentLookup.findById(documentId);
    if (!document) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    this.assertTenantAccess(caller, document.tenant_id);

    const now = new Date().toISOString();

    // Transition to Processing
    await this.documentLookup.updateStatus(documentId, 'Processing');

    // Emit PolicyDocumentProcessingStarted
    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyDocumentProcessingStarted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: document.tenant_id,
      source: 'extraction-service',
      payload: { document_id: documentId },
    } as unknown as BaseEvent);

    // Audit: extraction started
    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyDocument', documentId, 'ExtractionStarted'),
    );

    try {
      // Extract text via Textract (ADR-004)
      const textractResult = await this.textract.extractText(
        document.storage_location,
        document.content_type,
      );

      // Handle empty documents
      if (textractResult.page_count === 0) {
        throw new ExtractionError('Document contains no extractable text');
      }

      // Store extracted text per page (BR-008: retain original)
      const extractedPages: ExtractedDocumentText[] = textractResult.pages.map((page) => ({
        extracted_text_id: uuidv4(),
        document_id: documentId,
        tenant_id: document.tenant_id,
        page_number: page.page_number,
        page_text: page.text,
        extraction_timestamp: now,
        created_at: now,
      }));

      await this.extractedTextRepo.createBatch(extractedPages);

      // Update document status to TextExtracted
      await this.documentLookup.updateStatus(documentId, 'TextExtracted');

      // Emit PolicyDocumentTextExtracted
      await this.eventBus.publish({
        event_id: uuidv4(),
        event_type: 'PolicyDocumentTextExtracted',
        event_version: '1.0',
        timestamp: now,
        correlation_id: uuidv4(),
        tenant_id: document.tenant_id,
        source: 'extraction-service',
        payload: { document_id: documentId, page_count: textractResult.page_count },
      } as unknown as BaseEvent);

      // Audit: extraction completed
      await this.auditRepo.create(
        this.buildAudit(caller, 'PolicyDocument', documentId, 'ExtractionCompleted'),
      );

      return {
        document_id: documentId,
        tenant_id: document.tenant_id,
        pages: extractedPages,
        page_count: textractResult.page_count,
        extraction_timestamp: now,
      };
    } catch (err) {
      // Update status to ExtractionFailed
      await this.documentLookup.updateStatus(documentId, 'ExtractionFailed');

      const errorMessage = err instanceof Error ? err.message : 'Unknown extraction error';

      // Emit PolicyDocumentExtractionFailed
      await this.eventBus.publish({
        event_id: uuidv4(),
        event_type: 'PolicyDocumentExtractionFailed',
        event_version: '1.0',
        timestamp: now,
        correlation_id: uuidv4(),
        tenant_id: document.tenant_id,
        source: 'extraction-service',
        payload: { document_id: documentId, error_message: errorMessage },
      } as unknown as BaseEvent);

      // Audit: extraction failed
      await this.auditRepo.create(
        this.buildAudit(caller, 'PolicyDocument', documentId, 'ExtractionFailed'),
      );

      throw new ExtractionError(errorMessage);
    }
  }

  /**
   * Get extracted text for a document (all pages).
   */
  async getExtractedText(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<ExtractedDocumentText[]> {
    const document = await this.documentLookup.findById(documentId);
    if (!document) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    if (document.enterprise_id !== enterpriseId) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    this.assertTenantAccess(caller, document.tenant_id);

    const pages = await this.extractedTextRepo.findByDocument(documentId);

    // Audit: text viewed
    await this.auditRepo.create(
      this.buildAudit(caller, 'ExtractedDocumentText', documentId, 'ExtractedTextViewed'),
    );

    return pages;
  }

  /**
   * Get extracted pages for a document.
   */
  async getPages(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<{ page_number: number; text_preview: string }[]> {
    const pages = await this.getExtractedText(enterpriseId, documentId, caller);
    return pages.map((p) => ({
      page_number: p.page_number,
      text_preview: p.page_text.substring(0, 200),
    }));
  }

  private assertTenantAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private buildAudit(
    caller: CallerContext,
    entityType: string,
    entityId: string,
    action: string,
  ): AuditEntry {
    return {
      audit_id: uuidv4(),
      tenant_id: caller.tenant_id,
      user_id: caller.user_id,
      entity_type: entityType,
      entity_id: entityId,
      action,
      timestamp: new Date().toISOString(),
    };
  }
}
