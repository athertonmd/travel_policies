import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentService } from '../services/document-service';
import { InMemoryDocumentRepository } from '../repositories/in-memory/in-memory-document-repository';
import { InMemoryEnterpriseLookup } from '../repositories/in-memory/in-memory-enterprise-lookup';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryStorageProvider } from '../storage/in-memory-storage';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, UploadDocumentRequest } from '../domain/types';

describe('DocumentService', () => {
  let documentRepo: InMemoryDocumentRepository;
  let enterpriseLookup: InMemoryEnterpriseLookup;
  let auditRepo: InMemoryAuditRepository;
  let storage: InMemoryStorageProvider;
  let eventBus: InMemoryEventBus;
  let service: DocumentService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const tmcAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440020',
    tenant_id: tenantId,
    role: 'TMCAdmin',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'TMCAdmin',
  };

  const pdfContent = Buffer.from('%PDF-1.4 sample content');
  const docxContent = Buffer.from('PK\x03\x04 sample docx content');

  function makePdfUpload(filename = 'travel-policy.pdf'): UploadDocumentRequest {
    return {
      filename,
      content_type: 'application/pdf',
      file_size: pdfContent.length,
      file_content: pdfContent,
    };
  }

  function makeDocxUpload(filename = 'travel-policy.docx'): UploadDocumentRequest {
    return {
      filename,
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: docxContent.length,
      file_content: docxContent,
    };
  }

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepository();
    enterpriseLookup = new InMemoryEnterpriseLookup();
    auditRepo = new InMemoryAuditRepository();
    storage = new InMemoryStorageProvider();
    eventBus = new InMemoryEventBus();
    service = new DocumentService(documentRepo, enterpriseLookup, auditRepo, storage, eventBus);

    // Register enterprise
    enterpriseLookup.addEnterprise({
      enterprise_id: enterpriseId,
      tenant_id: tenantId,
      status: 'Active',
    });
  });

  describe('Upload PDF', () => {
    it('should upload a PDF document successfully', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      expect(result.document_id).toBeDefined();
      expect(result.version_number).toBe(1);
      expect(result.upload_status).toBe('Uploaded');
    });

    it('should store the file in S3', async () => {
      await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const key = `${tenantId}/${enterpriseId}/v1/travel-policy.pdf`;
      const exists = await storage.exists(key);
      expect(exists).toBe(true);
    });
  });

  describe('Upload DOCX', () => {
    it('should upload a DOCX document successfully', async () => {
      const result = await service.uploadDocument(enterpriseId, makeDocxUpload(), tmcAdmin);
      expect(result.document_id).toBeDefined();
      expect(result.version_number).toBe(1);
      expect(result.upload_status).toBe('Uploaded');
    });
  });

  describe('Invalid file type', () => {
    it('should reject unsupported file types', async () => {
      const invalidUpload: UploadDocumentRequest = {
        filename: 'spreadsheet.xlsx',
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size: 1000,
        file_content: Buffer.from('fake'),
      };
      await expect(
        service.uploadDocument(enterpriseId, invalidUpload, tmcAdmin),
      ).rejects.toThrow('Invalid document upload');
    });

    it('should reject zero file size', async () => {
      const invalidUpload: UploadDocumentRequest = {
        filename: 'empty.pdf',
        content_type: 'application/pdf',
        file_size: 0,
        file_content: Buffer.from(''),
      };
      await expect(
        service.uploadDocument(enterpriseId, invalidUpload, tmcAdmin),
      ).rejects.toThrow('Invalid document upload');
    });
  });

  describe('Invalid enterprise', () => {
    it('should reject upload for non-existent enterprise', async () => {
      await expect(
        service.uploadDocument('550e8400-e29b-41d4-a716-446655440099', makePdfUpload(), tmcAdmin),
      ).rejects.toThrow('Enterprise not found');
    });
  });

  describe('Version generation (BR-005, BR-012)', () => {
    it('should auto-increment version numbers', async () => {
      const v1 = await service.uploadDocument(enterpriseId, makePdfUpload('v1.pdf'), tmcAdmin);
      const v2 = await service.uploadDocument(enterpriseId, makePdfUpload('v2.pdf'), tmcAdmin);
      const v3 = await service.uploadDocument(enterpriseId, makePdfUpload('v3.pdf'), tmcAdmin);
      expect(v1.version_number).toBe(1);
      expect(v2.version_number).toBe(2);
      expect(v3.version_number).toBe(3);
    });
  });

  describe('Multiple uploads', () => {
    it('should store multiple documents for an enterprise', async () => {
      await service.uploadDocument(enterpriseId, makePdfUpload('policy-air.pdf'), tmcAdmin);
      await service.uploadDocument(enterpriseId, makeDocxUpload('policy-hotel.docx'), tmcAdmin);
      const docs = await service.listDocuments(enterpriseId, tmcAdmin);
      expect(docs).toHaveLength(2);
    });
  });

  describe('Checksum generation', () => {
    it('should generate SHA-256 checksum for uploaded documents', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const doc = await service.getDocument(enterpriseId, result.document_id, tmcAdmin);
      expect(doc.checksum).toBeDefined();
      expect(doc.checksum).toHaveLength(64); // SHA-256 hex
    });

    it('should produce consistent checksums for same content', async () => {
      const r1 = await service.uploadDocument(enterpriseId, makePdfUpload('a.pdf'), tmcAdmin);
      const r2 = await service.uploadDocument(enterpriseId, makePdfUpload('b.pdf'), tmcAdmin);
      const d1 = await service.getDocument(enterpriseId, r1.document_id, tmcAdmin);
      const d2 = await service.getDocument(enterpriseId, r2.document_id, tmcAdmin);
      expect(d1.checksum).toBe(d2.checksum);
    });
  });

  describe('Tenant isolation (BR-042, ADR-020)', () => {
    it('should prevent cross-tenant document upload', async () => {
      await expect(
        service.uploadDocument(enterpriseId, makePdfUpload(), otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant document listing', async () => {
      await expect(
        service.listDocuments(enterpriseId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant document retrieval', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      await expect(
        service.getDocument(enterpriseId, result.document_id, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should allow SystemAdmin access to any enterprise', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const doc = await service.getDocument(enterpriseId, result.document_id, systemAdmin);
      expect(doc.document_id).toBe(result.document_id);
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyDocumentUploaded on upload', async () => {
      await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const events = eventBus.getEventsByType('PolicyDocumentUploaded');
      expect(events).toHaveLength(1);
      const payload = (events[0] as unknown as { payload: { enterprise_id: string } }).payload;
      expect(payload.enterprise_id).toBe(enterpriseId);
    });

    it('should emit PolicyDocumentProcessingStarted on startProcessing', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      await service.startProcessing(result.document_id, tmcAdmin);
      const events = eventBus.getEventsByType('PolicyDocumentProcessingStarted');
      expect(events).toHaveLength(1);
    });
  });

  describe('Audit logging (BR-043)', () => {
    it('should create audit entry on document upload', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', result.document_id);
      expect(audits.some((a) => a.action === 'DocumentUploaded')).toBe(true);
    });

    it('should create audit entry on document view', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      await service.getDocument(enterpriseId, result.document_id, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', result.document_id);
      expect(audits.some((a) => a.action === 'DocumentViewed')).toBe(true);
    });

    it('should create audit entry on version list view', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      await service.listVersions(enterpriseId, result.document_id, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', result.document_id);
      expect(audits.some((a) => a.action === 'DocumentVersionViewed')).toBe(true);
    });
  });

  describe('Document metadata', () => {
    it('should capture all required metadata', async () => {
      const result = await service.uploadDocument(enterpriseId, makePdfUpload(), tmcAdmin);
      const doc = await service.getDocument(enterpriseId, result.document_id, tmcAdmin);
      expect(doc.filename).toBe('travel-policy.pdf');
      expect(doc.content_type).toBe('application/pdf');
      expect(doc.file_size).toBe(pdfContent.length);
      expect(doc.uploaded_by).toBe(tmcAdmin.user_id);
      expect(doc.uploaded_at).toBeDefined();
      expect(doc.checksum).toBeDefined();
      expect(doc.storage_location).toContain('s3://');
      expect(doc.version_number).toBe(1);
      expect(doc.status).toBe('Uploaded');
    });
  });
});
