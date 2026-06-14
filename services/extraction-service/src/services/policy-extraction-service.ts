import { v4 as uuidv4 } from 'uuid';
import {
  ExtractedPolicyEntity,
  PolicyRuleEntity,
  PolicyExtractionInput,
  getConfidenceBand,
  isValidRuleType,
} from '../domain/ai-types';
import { CallerContext, AuditEntry, ExtractedDocumentText } from '../domain/types';
import { NotFoundError, ForbiddenError, ExtractionError } from '../domain/errors';
import { ExtractedTextRepository } from '../repositories/extracted-text-repository';
import { DocumentLookup } from '../repositories/document-lookup';
import { ExtractedPolicyRepository, PolicyRuleRepository } from '../repositories/policy-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { PolicyAIProvider } from '../ai/policy-ai-provider';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

export type { CallerContext, AuditEntry } from '../domain/types';

/**
 * Policy Extraction Service — AI extraction of structured policy rules.
 *
 * Responsibilities:
 * - Retrieve extracted document text
 * - Call AI provider (Bedrock Claude Sonnet)
 * - Validate strict JSON response
 * - Create ExtractedPolicy + PolicyRule records
 * - Store raw AI output (BR-009, ADR-017)
 * - Update document status
 * - Emit events
 *
 * Enforces:
 * - BR-009: Original AI extraction always retained
 * - BR-013: Every rule has confidence score
 * - BR-014: Every rule has source reference
 * - BR-015: Every rule has rule type
 * - BR-016: Every rule belongs to a category
 * - BR-017: Low confidence = below 80
 * - BR-042: Cross-tenant prohibition
 */
export class PolicyExtractionService {
  constructor(
    private readonly extractedTextRepo: ExtractedTextRepository,
    private readonly documentLookup: DocumentLookup,
    private readonly policyRepo: ExtractedPolicyRepository,
    private readonly ruleRepo: PolicyRuleRepository,
    private readonly auditRepo: AuditRepository,
    private readonly aiProvider: PolicyAIProvider,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Extract policy rules from already-extracted document text.
   */
  async extractPolicy(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<{ policy: ExtractedPolicyEntity; rules: PolicyRuleEntity[] }> {
    // Retrieve document
    const document = await this.documentLookup.findById(documentId);
    if (!document) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    if (document.enterprise_id !== enterpriseId) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    this.assertTenantAccess(caller, document.tenant_id);

    const now = new Date().toISOString();

    // Audit: extraction started
    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyDocument', documentId, 'AIExtractionStarted'),
    );

    // Retrieve extracted text
    const pages = await this.extractedTextRepo.findByDocument(documentId);
    if (!pages || pages.length === 0) {
      // Fail: no extracted text available
      await this.documentLookup.updateStatus(documentId, 'ExtractionFailed');
      await this.emitExtractionFailed(document.tenant_id, documentId, 'No extracted text available', now);
      await this.auditRepo.create(
        this.buildAudit(caller, 'PolicyDocument', documentId, 'AIExtractionFailed'),
      );
      throw new ExtractionError('No extracted text available for AI extraction');
    }

    // Build AI input
    const input: PolicyExtractionInput = {
      document_id: documentId,
      enterprise_id: enterpriseId,
      policy_version: 1, // derived from document
      extracted_pages: pages.map((p: ExtractedDocumentText) => ({
        page_number: p.page_number,
        page_text: p.page_text,
      })),
    };

    try {
      // Call AI provider (ADR-005: Bedrock Claude Sonnet)
      const aiOutput = await this.aiProvider.extractPolicy(input);

      // Validate rules have valid taxonomy
      const validatedRules = aiOutput.extracted_rules.filter((r) => isValidRuleType(r.rule_type));

      // Create ExtractedPolicy record
      const policyId = uuidv4();
      const policy: ExtractedPolicyEntity = {
        policy_id: policyId,
        document_id: documentId,
        tenant_id: document.tenant_id,
        enterprise_id: enterpriseId,
        version_number: 1,
        extraction_model: aiOutput.model_name,
        extraction_timestamp: aiOutput.extraction_timestamp,
        overall_confidence: aiOutput.overall_confidence,
        raw_ai_output: JSON.stringify(aiOutput), // BR-009: retain original
        version: 1,
        created_at: now,
        updated_at: now,
      };

      const createdPolicy = await this.policyRepo.create(policy);

      // Create PolicyRule records (BR-013, BR-014, BR-015, BR-016)
      const ruleEntities: PolicyRuleEntity[] = validatedRules.map((rule) => ({
        rule_id: uuidv4(),
        policy_id: policyId,
        tenant_id: document.tenant_id,
        rule_type: rule.rule_type,
        category: rule.category,
        value: rule.value,
        confidence: rule.confidence,
        source_reference: JSON.stringify(rule.source_reference),
        ai_generated_value: rule.value,
        reviewed_value: null,
        review_status: getConfidenceBand(rule.confidence) === 'Low' ? 'PendingReview' : 'PendingReview',
        version: 1,
        created_at: now,
        updated_at: now,
      }));

      const createdRules = ruleEntities.length > 0
        ? await this.ruleRepo.createBatch(ruleEntities)
        : [];

      // Update document status to Review
      await this.documentLookup.updateStatus(documentId, 'Review');

      // Emit PolicyDocumentExtractionCompleted
      await this.eventBus.publish({
        event_id: uuidv4(),
        event_type: 'PolicyDocumentExtractionCompleted',
        event_version: '1.0',
        timestamp: now,
        correlation_id: uuidv4(),
        tenant_id: document.tenant_id,
        source: 'extraction-service',
        payload: { document_id: documentId, policy_id: policyId },
      } as unknown as BaseEvent);

      // Audit: extraction completed
      await this.auditRepo.create(
        this.buildAudit(caller, 'PolicyDocument', documentId, 'AIExtractionCompleted'),
      );

      return { policy: createdPolicy, rules: createdRules };
    } catch (err) {
      // Update status to ExtractionFailed
      await this.documentLookup.updateStatus(documentId, 'ExtractionFailed');

      const errorMessage = err instanceof Error ? err.message : 'Unknown AI extraction error';

      await this.emitExtractionFailed(document.tenant_id, documentId, errorMessage, now);

      // Audit: extraction failed
      await this.auditRepo.create(
        this.buildAudit(caller, 'PolicyDocument', documentId, 'AIExtractionFailed'),
      );

      throw err instanceof ExtractionError ? err : new ExtractionError(errorMessage);
    }
  }

  /**
   * Get extracted policy for a document.
   */
  async getExtractedPolicy(
    enterpriseId: string,
    documentId: string,
    caller: CallerContext,
  ): Promise<ExtractedPolicyEntity> {
    const document = await this.documentLookup.findById(documentId);
    if (!document || document.enterprise_id !== enterpriseId) {
      throw new NotFoundError('PolicyDocument', documentId);
    }
    this.assertTenantAccess(caller, document.tenant_id);

    const policy = await this.policyRepo.findByDocument(documentId);
    if (!policy) {
      throw new NotFoundError('ExtractedPolicy', documentId);
    }

    await this.auditRepo.create(
      this.buildAudit(caller, 'ExtractedPolicy', policy.policy_id, 'ExtractedPolicyViewed'),
    );

    return policy;
  }

  /**
   * Get policy rules for a policy.
   */
  async getPolicyRules(
    enterpriseId: string,
    policyId: string,
    caller: CallerContext,
  ): Promise<PolicyRuleEntity[]> {
    const policy = await this.policyRepo.findById(policyId);
    if (!policy || policy.enterprise_id !== enterpriseId) {
      throw new NotFoundError('ExtractedPolicy', policyId);
    }
    this.assertTenantAccess(caller, policy.tenant_id);

    const rules = await this.ruleRepo.findByPolicy(policyId);

    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyRule', policyId, 'PolicyRulesViewed'),
    );

    return rules;
  }

  private async emitExtractionFailed(
    tenantId: string,
    documentId: string,
    errorMessage: string,
    timestamp: string,
  ): Promise<void> {
    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyDocumentExtractionFailed',
      event_version: '1.0',
      timestamp,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'extraction-service',
      payload: { document_id: documentId, error_message: errorMessage },
    } as unknown as BaseEvent);
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
