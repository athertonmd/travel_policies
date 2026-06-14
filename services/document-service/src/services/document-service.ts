import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  PolicyDocumentEntity,
  UploadDocumentRequest,
  UploadDocumentResponse,
  CallerContext,
  AuditEntry,
  SupportedContentType,
} from '../domain/types';
import { UploadDocumentSchema } from '../domain/validation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import { DocumentRepository } from '../repositories/document-repository';
import { EnterpriseLookup } from '../repositories/enterprise-lookup';
import { AuditRepository } from '../repositories/audit-repository';
import { StorageProvider } from '../storage/storage-provider';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * Document Service — manages policy document upload, storage and versioning.
 *
 * Enforces:
 * - BR-005: Upload creates new version
 * - BR-006: Versions are immutable
 * - BR-007: Original document always retained
 * - BR-012: Sequential version numbers
 * - BR-033: Tenant-scoped access
 * - BR-042: Cross-tenant prohibition
 */
export class DocumentService {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly enterpriseLookup: EnterpriseLookup,
    private readonly auditRepo: AuditRepository,
    private readonly storage: StorageProvider,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Upload a new policy document.
   * Creates a new version automatically (BR-005, BR-012).
   */
  async uploadDocument(
    enterpriseId: string,
    request: UploadDocumentRequest,
    caller: CallerContext,
  ): Promise<UploadDocumentResponse> {
    // Validate enterprise exists and caller has access
    const enterprise = await this.enterpriseLookup.findById(enterpriseId);
    if (!enterprise) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }
    this.assertTenantAccess(caller, enterprise.tenant_id);

    // Validate upload request
    const parsed = UploadDocumentSchema.safeParse({
      filename: request.filename,
      content_type: request.content_type,
      file_size: request.file_size,
    });
    if (!parsed.success) {
      throw new ValidationError('Invalid document upload', parsed.error.issues);
    }

    // Generate next version number (BR-012: sequential)
    const latestVersion = await this.documentRepo.getLatestVersionNumber(enterpriseId);
    const versionNumber = latestVersion + 1;

    // Compute checksum
    const checksum = createHash('sha256').update(request.file_content).digest('hex');

    // Store in S3 (BR-007: original always retained)
    const storageKey = `${enterprise.tenant_id}/${enterpriseId}/v${versionNumber}/${request.filename}`;
    const storageResult = await this.storage.upload(storageKey, request.file_content, {
      content_type: request.content_type,
      file_size: request.file_size,
      checksum,
      enterprise_id: enterpriseId,
      version_number: versionNumber,
    });

    // Create document record
    const now = new Date().toISOString();
    const document: PolicyDocumentEntity = {
      document_id: uuidv4(),
      tenant_id: enterprise.tenant_id,
      enterprise_id: enterpriseId,
      version_number: versionNumber,
      filename: request.filename,
      content_type: parsed.data.content_type as SupportedContentType,
      file_size: request.file_size,
      storage_location: storageResult.storage_location,
      uploaded_by: caller.user_id,
      uploaded_at: now,
      status: 'Uploaded',
      checksum: storageResult.checksum,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const created = await this.documentRepo.create(document);

    // Emit PolicyDocumentUploaded event
    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyDocumentUploaded',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: enterprise.tenant_id,
      source: 'document-service',
      payload: {
        document_id: created.document_id,
        enterprise_id: enterpriseId,
        version_number: versionNumber,
      },
    } as unknown as BaseEvent);

    // Audit log (BR-043)
    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyDocument', created.document_id, 'DocumentUploaded'),
    );

    return {
      document_id: created.document_id,
      version_number: versionNumber,
      upload_status: 'Uploaded',
    };
  }

  /**
   * Get document by ID.
   */
  async getDocument(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<PolicyDocumentEntity> {
    const enterprise = await this.enterpriseLookup.findById(enterpriseId);
    if (!enterprise) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }
    this.assertTenantAccess(caller, enterprise.tenant_id);

    const document = await this.documentRepo.findById(documentId);
    if (!document || document.enterprise_id !== enterpriseId) {
      throw new NotFoundError('PolicyDocument', documentId);
    }

    // Audit view (BR-043)
    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyDocument', documentId, 'DocumentViewed'),
    );

    return document;
  }

  /**
   * List documents for an enterprise.
   */
  async listDocuments(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<PolicyDocumentEntity[]> {
    const enterprise = await this.enterpriseLookup.findById(enterpriseId);
    if (!enterprise) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }
    this.assertTenantAccess(caller, enterprise.tenant_id);

    return this.documentRepo.findByEnterprise(enterpriseId);
  }

  /**
   * List all versions for an enterprise's documents.
   */
  async listVersions(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<PolicyDocumentEntity[]> {
    const enterprise = await this.enterpriseLookup.findById(enterpriseId);
    if (!enterprise) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }
    this.assertTenantAccess(caller, enterprise.tenant_id);

    // Audit version view (BR-043)
    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyDocument', documentId, 'DocumentVersionViewed'),
    );

    return this.documentRepo.findVersions(enterpriseId, documentId);
  }

  /**
   * Transition document to Processing status and emit event.
   */
  async startProcessing(documentId: string, caller: CallerContext): Promise<PolicyDocumentEntity> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    this.assertTenantAccess(caller, document.tenant_id);

    const now = new Date().toISOString();
    const updated: PolicyDocumentEntity = {
      ...document,
      status: 'Processing',
      version: document.version + 1,
      updated_at: now,
    };

    const result = await this.documentRepo.update(updated);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyDocumentProcessingStarted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: document.tenant_id,
      source: 'document-service',
      payload: { document_id: documentId },
    } as unknown as BaseEvent);

    return result;
  }

  /**
   * Enforce tenant access (BR-039, BR-040, BR-042).
   */
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
