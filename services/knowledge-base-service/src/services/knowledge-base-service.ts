import { v4 as uuidv4 } from 'uuid';
import { KBChunk, SearchResponse, CorrectionContext, CallerContext, AuditEntry } from '../domain/types';
import { ForbiddenError } from '../domain/errors';
import { chunkText } from '../chunking/chunker';
import { EmbeddingProvider } from '../embedding/embedding-provider';
import { VectorStore } from '../vector-store/vector-store';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/** Audit repository interface */
export interface AuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

/** Correction store interface */
export interface CorrectionStore {
  findByEnterprise(enterpriseId: string): Promise<CorrectionContext[]>;
  findByRuleType(enterpriseId: string, ruleType: string): Promise<CorrectionContext[]>;
}

/**
 * Knowledge Base Service — indexing and semantic retrieval.
 *
 * Enforces:
 * - BR-035: KB searches must be enterprise scoped
 * - BR-036: Reviewer corrections included in retrieval context
 * - BR-037: Policy versions remain searchable
 * - ADR-015: Enterprise-specific knowledge bases
 */
export class KnowledgeBaseService {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorStore: VectorStore,
    private readonly correctionStore: CorrectionStore,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Index extracted document text.
   */
  async indexDocumentText(
    text: string,
    metadata: { enterprise_id: string; tenant_id: string; document_id: string; policy_version: number; page_number: number },
    caller: CallerContext,
  ): Promise<KBChunk[]> {
    this.assertTenantAccess(caller, metadata.tenant_id);

    const chunks = chunkText(text, {
      ...metadata,
      policy_id: null,
      section_reference: null,
      source_type: 'DocumentText',
    });

    await this.embedAndStore(chunks, metadata.enterprise_id, metadata.policy_version);

    await this.emitEvent('PolicyIndexed', metadata.tenant_id, metadata.document_id);
    await this.auditRepo.create(this.buildAudit(caller, 'KnowledgeBase', metadata.document_id, 'PolicyIndexed'));

    return chunks;
  }

  /**
   * Index approved policy JSON.
   */
  async indexApprovedPolicy(
    policyJson: string,
    metadata: { enterprise_id: string; tenant_id: string; policy_id: string; policy_version: number },
    caller: CallerContext,
  ): Promise<KBChunk[]> {
    this.assertTenantAccess(caller, metadata.tenant_id);

    const chunks = chunkText(policyJson, {
      enterprise_id: metadata.enterprise_id,
      tenant_id: metadata.tenant_id,
      document_id: null,
      policy_id: metadata.policy_id,
      policy_version: metadata.policy_version,
      page_number: null,
      section_reference: null,
      source_type: 'ApprovedPolicy',
    });

    await this.embedAndStore(chunks, metadata.enterprise_id, metadata.policy_version);

    await this.emitEvent('PolicyIndexed', metadata.tenant_id, metadata.policy_id);
    await this.auditRepo.create(this.buildAudit(caller, 'KnowledgeBase', metadata.policy_id, 'PolicyIndexed'));

    return chunks;
  }

  /**
   * Index reviewer corrections.
   */
  async indexCorrections(
    corrections: { rule_type: string; ai_value: string; reviewer_value: string; reason: string }[],
    metadata: { enterprise_id: string; tenant_id: string; policy_id: string; policy_version: number },
    caller: CallerContext,
  ): Promise<KBChunk[]> {
    this.assertTenantAccess(caller, metadata.tenant_id);

    const text = corrections.map((c) =>
      `Rule: ${c.rule_type}. AI value: ${c.ai_value}. Reviewer value: ${c.reviewer_value}. Reason: ${c.reason}.`
    ).join('\n');

    const chunks = chunkText(text, {
      enterprise_id: metadata.enterprise_id,
      tenant_id: metadata.tenant_id,
      document_id: null,
      policy_id: metadata.policy_id,
      policy_version: metadata.policy_version,
      page_number: null,
      section_reference: null,
      source_type: 'ReviewerCorrection',
    });

    await this.embedAndStore(chunks, metadata.enterprise_id, metadata.policy_version);

    await this.emitEvent('PolicyEmbeddingCreated', metadata.tenant_id, metadata.policy_id);
    await this.auditRepo.create(this.buildAudit(caller, 'KnowledgeBase', metadata.policy_id, 'CorrectionIndexed'));

    return chunks;
  }

  /**
   * Index policy changes.
   */
  async indexPolicyChanges(
    changes: { rule_type: string; old_value: string | null; new_value: string | null; change_type: string }[],
    metadata: { enterprise_id: string; tenant_id: string; policy_id: string; policy_version: number },
    caller: CallerContext,
  ): Promise<KBChunk[]> {
    this.assertTenantAccess(caller, metadata.tenant_id);

    const text = changes.map((c) =>
      `Change: ${c.rule_type}. Type: ${c.change_type}. Old: ${c.old_value ?? 'N/A'}. New: ${c.new_value ?? 'N/A'}.`
    ).join('\n');

    const chunks = chunkText(text, {
      enterprise_id: metadata.enterprise_id,
      tenant_id: metadata.tenant_id,
      document_id: null,
      policy_id: metadata.policy_id,
      policy_version: metadata.policy_version,
      page_number: null,
      section_reference: null,
      source_type: 'PolicyChange',
    });

    await this.embedAndStore(chunks, metadata.enterprise_id, metadata.policy_version);

    return chunks;
  }

  /**
   * Enterprise-scoped semantic search (BR-035).
   */
  async search(
    enterpriseId: string,
    tenantId: string,
    query: string,
    caller: CallerContext,
    limit = 10,
  ): Promise<SearchResponse> {
    this.assertTenantAccess(caller, tenantId);

    const embeddingResult = await this.embeddingProvider.createEmbedding({
      text: query,
      enterprise_id: enterpriseId,
      policy_version: 0,
    });

    const results = await this.vectorStore.search(enterpriseId, embeddingResult.embedding, limit);

    await this.emitEvent('KnowledgeSearchPerformed', tenantId, enterpriseId);
    await this.auditRepo.create(this.buildAudit(caller, 'KnowledgeBase', enterpriseId, 'KnowledgeSearchPerformed'));

    return { enterpriseId, query, results };
  }

  /**
   * Get correction context for a rule type (BR-036).
   */
  async getCorrectionContext(
    enterpriseId: string,
    ruleType: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<CorrectionContext[]> {
    this.assertTenantAccess(caller, tenantId);

    const corrections = await this.correctionStore.findByRuleType(enterpriseId, ruleType);

    await this.auditRepo.create(this.buildAudit(caller, 'KnowledgeBase', `${enterpriseId}/${ruleType}`, 'CorrectionContextRetrieved'));

    return corrections;
  }

  private async embedAndStore(chunks: KBChunk[], enterpriseId: string, policyVersion: number): Promise<void> {
    for (const chunk of chunks) {
      const embResult = await this.embeddingProvider.createEmbedding({
        text: chunk.chunk_text,
        enterprise_id: enterpriseId,
        policy_version: policyVersion,
      });

      await this.vectorStore.upsertChunk({
        chunk_id: chunk.chunk_id,
        enterprise_id: enterpriseId,
        embedding: embResult.embedding,
        metadata: chunk,
      });
    }
  }

  private async emitEvent(eventType: string, tenantId: string, entityId: string): Promise<void> {
    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: eventType,
      event_version: '1.0',
      timestamp: new Date().toISOString(),
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'knowledge-base-service',
      payload: { policy_id: entityId },
    } as unknown as BaseEvent);
  }

  private assertTenantAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private buildAudit(caller: CallerContext, entityType: string, entityId: string, action: string): AuditEntry {
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
