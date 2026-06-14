import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentProcessingService } from '../services/document-processing-service';
import { InMemoryExtractedTextRepository } from '../repositories/in-memory/in-memory-extracted-text-repository';
import { InMemoryDocumentLookup } from '../repositories/in-memory/in-memory-document-lookup';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryTextractProvider } from '../textract/in-memory-textract';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, DocumentRef } from '../domain/types';

describe('DocumentProcessingService', () => {
  let extractedTextRepo: InMemoryExtractedTextRepository;
  let documentLookup: InMemoryDocumentLookup;
  let auditRepo: InMemoryAuditRepository;
  let textract: InMemoryTextractProvider;
  let eventBus: InMemoryEventBus;
  let service: DocumentProcessingService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const documentId = '550e8400-e29b-41d4-a716-446655440020';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const tmcAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: tenantId,
    role: 'TMCAdmin',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'TMCAdmin',
  };

  const pdfDocument: DocumentRef = {
    document_id: documentId,
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    filename: 'travel-policy.pdf',
    content_type: 'application/pdf',
    storage_location: `s3://policy-documents/${tenantId}/${enterpriseId}/v1/travel-policy.pdf`,
    status: 'Uploaded',
  };

  const docxDocument: DocumentRef = {
    document_id: '550e8400-e29b-41d4-a716-446655440021',
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    filename: 'hotel-policy.docx',
    content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storage_location: `s3://policy-documents/${tenantId}/${enterpriseId}/v2/hotel-policy.docx`,
    status: 'Uploaded',
  };

  beforeEach(() => {
    extractedTextRepo = new InMemoryExtractedTextRepository();
    documentLookup = new InMemoryDocumentLookup();
    auditRepo = new InMemoryAuditRepository();
    textract = new InMemoryTextractProvider();
    eventBus = new InMemoryEventBus();
    service = new DocumentProcessingService(
      extractedTextRepo,
      documentLookup,
      auditRepo,
      textract,
      eventBus,
    );

    documentLookup.addDocument(pdfDocument);
    documentLookup.addDocument(docxDocument);
  });

  describe('PDF extraction', () => {
    it('should extract text from a PDF document', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Page 1: Travel policy introduction.' },
        { page_number: 2, text: 'Page 2: Air travel rules.' },
        { page_number: 3, text: 'Page 3: Hotel booking guidelines.' },
      ]);

      const result = await service.processDocument(documentId, tmcAdmin);
      expect(result.page_count).toBe(3);
      expect(result.pages).toHaveLength(3);
      expect(result.pages[0].page_text).toContain('Travel policy introduction');
    });
  });

  describe('DOCX extraction', () => {
    it('should extract text from a DOCX document', async () => {
      textract.setResult(docxDocument.storage_location, [
        { page_number: 1, text: 'Hotel policy content from DOCX.' },
      ]);

      const result = await service.processDocument(docxDocument.document_id, tmcAdmin);
      expect(result.page_count).toBe(1);
      expect(result.pages[0].page_text).toContain('Hotel policy content');
    });
  });

  describe('Multi-page documents', () => {
    it('should extract and store all pages with correct page numbers', async () => {
      const pages = Array.from({ length: 10 }, (_, i) => ({
        page_number: i + 1,
        text: `Page ${i + 1} content for multi-page test.`,
      }));
      textract.setResult(pdfDocument.storage_location, pages);

      const result = await service.processDocument(documentId, tmcAdmin);
      expect(result.page_count).toBe(10);
      expect(result.pages[4].page_number).toBe(5);
      expect(result.pages[9].page_number).toBe(10);
    });
  });

  describe('Empty document', () => {
    it('should fail extraction for documents with no text', async () => {
      textract.setResult(pdfDocument.storage_location, []);

      await expect(service.processDocument(documentId, tmcAdmin)).rejects.toThrow(
        'Document contains no extractable text',
      );
    });

    it('should set status to ExtractionFailed for empty documents', async () => {
      textract.setResult(pdfDocument.storage_location, []);

      try {
        await service.processDocument(documentId, tmcAdmin);
      } catch {
        // expected
      }
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('ExtractionFailed');
    });
  });

  describe('Corrupt document (extraction failure)', () => {
    it('should handle Textract extraction failures', async () => {
      textract.setFailure(pdfDocument.storage_location);

      await expect(service.processDocument(documentId, tmcAdmin)).rejects.toThrow(
        'Textract extraction failed',
      );
    });

    it('should set status to ExtractionFailed', async () => {
      textract.setFailure(pdfDocument.storage_location);

      try {
        await service.processDocument(documentId, tmcAdmin);
      } catch {
        // expected
      }
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('ExtractionFailed');
    });

    it('should emit PolicyDocumentExtractionFailed event', async () => {
      textract.setFailure(pdfDocument.storage_location);

      try {
        await service.processDocument(documentId, tmcAdmin);
      } catch {
        // expected
      }
      const events = eventBus.getEventsByType('PolicyDocumentExtractionFailed');
      expect(events).toHaveLength(1);
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyDocumentProcessingStarted', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Content' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const events = eventBus.getEventsByType('PolicyDocumentProcessingStarted');
      expect(events).toHaveLength(1);
    });

    it('should emit PolicyDocumentTextExtracted on success', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Page 1' },
        { page_number: 2, text: 'Page 2' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const events = eventBus.getEventsByType('PolicyDocumentTextExtracted');
      expect(events).toHaveLength(1);
      const payload = (events[0] as unknown as { payload: { page_count: number } }).payload;
      expect(payload.page_count).toBe(2);
    });
  });

  describe('Audit logging', () => {
    it('should log extraction started', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Text' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'ExtractionStarted')).toBe(true);
    });

    it('should log extraction completed', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Text' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'ExtractionCompleted')).toBe(true);
    });

    it('should log extraction failed', async () => {
      textract.setFailure(pdfDocument.storage_location);

      try {
        await service.processDocument(documentId, tmcAdmin);
      } catch {
        // expected
      }
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'ExtractionFailed')).toBe(true);
    });

    it('should log extracted text viewed', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'View test' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      await service.getExtractedText(enterpriseId, documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('ExtractedDocumentText', documentId);
      expect(audits.some((a) => a.action === 'ExtractedTextViewed')).toBe(true);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant document processing', async () => {
      await expect(
        service.processDocument(documentId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant text retrieval', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Secret content' },
      ]);
      await service.processDocument(documentId, tmcAdmin);

      await expect(
        service.getExtractedText(enterpriseId, documentId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should allow SystemAdmin access', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'Admin viewable' },
      ]);
      await service.processDocument(documentId, tmcAdmin);

      const pages = await service.getExtractedText(enterpriseId, documentId, systemAdmin);
      expect(pages).toHaveLength(1);
    });
  });

  describe('Processing state transitions', () => {
    it('should transition Uploaded → Processing → TextExtracted on success', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'OK' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('TextExtracted');
    });

    it('should transition Uploaded → Processing → ExtractionFailed on error', async () => {
      textract.setFailure(pdfDocument.storage_location);

      try {
        await service.processDocument(documentId, tmcAdmin);
      } catch {
        // expected
      }
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('ExtractionFailed');
    });
  });

  describe('Get pages API', () => {
    it('should return page summaries with previews', async () => {
      textract.setResult(pdfDocument.storage_location, [
        { page_number: 1, text: 'First page with lots of detailed text about travel policy.' },
        { page_number: 2, text: 'Second page content.' },
      ]);

      await service.processDocument(documentId, tmcAdmin);
      const pages = await service.getPages(enterpriseId, documentId, tmcAdmin);
      expect(pages).toHaveLength(2);
      expect(pages[0].page_number).toBe(1);
      expect(pages[0].text_preview).toContain('First page');
    });
  });
});
