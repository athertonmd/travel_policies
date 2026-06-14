import { v4 as uuidv4 } from 'uuid';
import {
  ReviewSessionEntity,
  ReviewableRule,
  RuleCorrectionEntity,
  ReviewItem,
  CallerContext,
  AuditEntry,
  ModifyRuleRequest,
  RejectRuleRequest,
  LOW_CONFIDENCE_THRESHOLD,
} from '../domain/types';
import { NotFoundError, ForbiddenError, ValidationError, ReviewCompletionError } from '../domain/errors';
import { ReviewSessionRepository } from '../repositories/review-session-repository';
import { RuleRepository } from '../repositories/rule-repository';
import { CorrectionRepository } from '../repositories/correction-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * Review Service — manages human review of AI-extracted policy rules.
 *
 * Enforces:
 * - BR-019: Every policy must pass review before publication
 * - BR-020: Approve / Modify / Reject
 * - BR-021: Modifications require reason
 * - BR-022: Rejections require reason
 * - BR-023: Review completion requires all low confidence rules assessed
 * - BR-024: Review completion requires all changes saved
 * - ADR-009: Store reviewer corrections permanently
 * - ADR-012: Side-by-side review interface data
 */
export class ReviewService {
  constructor(
    private readonly sessionRepo: ReviewSessionRepository,
    private readonly ruleRepo: RuleRepository,
    private readonly correctionRepo: CorrectionRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Start a review session for a policy.
   */
  async startReview(
    enterpriseId: string,
    policyId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ReviewSessionEntity> {
    this.assertTenantAccess(caller, tenantId);

    const now = new Date().toISOString();
    const session: ReviewSessionEntity = {
      review_id: uuidv4(),
      policy_id: policyId,
      tenant_id: tenantId,
      enterprise_id: enterpriseId,
      reviewer_id: caller.user_id,
      status: 'InProgress',
      started_at: now,
      completed_at: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const created = await this.sessionRepo.create(session);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'ReviewStarted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'review-service',
      payload: { review_id: created.review_id, policy_id: policyId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(
      this.buildAudit(caller, 'ReviewSession', created.review_id, 'ReviewStarted'),
    );

    return created;
  }

  /**
   * Get a review session.
   */
  async getReview(
    reviewId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ReviewSessionEntity> {
    this.assertTenantAccess(caller, tenantId);

    const session = await this.sessionRepo.findById(reviewId);
    if (!session || session.tenant_id !== tenantId) {
      throw new NotFoundError('ReviewSession', reviewId);
    }
    return session;
  }

  /**
   * Get review items (side-by-side data, ADR-012).
   */
  async getReviewItems(
    policyId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ReviewItem[]> {
    this.assertTenantAccess(caller, tenantId);

    const rules = await this.ruleRepo.findByPolicy(policyId);

    await this.auditRepo.create(
      this.buildAudit(caller, 'ReviewItem', policyId, 'ReviewItemViewed'),
    );

    return rules.map((rule) => {
      let source = { page_number: null as number | null, paragraph_reference: null as string | null, source_text: null as string | null };
      try {
        const ref = JSON.parse(rule.source_reference);
        source = {
          page_number: ref.page_number ?? null,
          paragraph_reference: ref.paragraph_reference ?? null,
          source_text: ref.source_text ?? null,
        };
      } catch { /* invalid JSON, leave defaults */ }

      return {
        rule_id: rule.rule_id,
        rule_type: rule.rule_type,
        category: rule.category,
        confidence: rule.confidence,
        review_status: rule.review_status,
        source,
        extraction: {
          ai_generated_value: rule.ai_generated_value,
          reviewed_value: rule.reviewed_value,
        },
      };
    });
  }

  /**
   * Approve a rule.
   */
  async approveRule(
    policyId: string,
    ruleId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ReviewableRule> {
    this.assertTenantAccess(caller, tenantId);

    const rule = await this.getRule(ruleId, policyId, tenantId);
    const now = new Date().toISOString();

    const updated: ReviewableRule = {
      ...rule,
      review_status: 'Approved',
      reviewed_value: rule.ai_generated_value,
      version: rule.version + 1,
    };

    const result = await this.ruleRepo.update(updated);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'RuleApproved',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'review-service',
      payload: { rule_id: ruleId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyRule', ruleId, 'RuleApproved'),
    );

    return result;
  }

  /**
   * Modify a rule (BR-021: reason required, ADR-009: store correction).
   */
  async modifyRule(
    policyId: string,
    ruleId: string,
    tenantId: string,
    request: ModifyRuleRequest,
    caller: CallerContext,
  ): Promise<ReviewableRule> {
    this.assertTenantAccess(caller, tenantId);

    if (!request.reviewer_value || !request.reason) {
      throw new ValidationError('Modify requires reviewer_value and reason (BR-021)');
    }

    const rule = await this.getRule(ruleId, policyId, tenantId);
    const now = new Date().toISOString();

    const updated: ReviewableRule = {
      ...rule,
      review_status: 'Modified',
      reviewed_value: request.reviewer_value,
      version: rule.version + 1,
    };

    const result = await this.ruleRepo.update(updated);

    // Create correction record (ADR-009, BR-010)
    const correction: RuleCorrectionEntity = {
      correction_id: uuidv4(),
      rule_id: ruleId,
      tenant_id: tenantId,
      ai_value: rule.ai_generated_value,
      reviewer_value: request.reviewer_value,
      reason: request.reason,
      reviewer: caller.user_id,
      correction_timestamp: now,
      created_at: now,
    };

    await this.correctionRepo.create(correction);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'RuleModified',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'review-service',
      payload: { rule_id: ruleId, old_value: rule.ai_generated_value, new_value: request.reviewer_value },
    } as unknown as BaseEvent);

    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyRule', ruleId, 'RuleModified'),
    );

    return result;
  }

  /**
   * Reject a rule (BR-022: reason required).
   */
  async rejectRule(
    policyId: string,
    ruleId: string,
    tenantId: string,
    request: RejectRuleRequest,
    caller: CallerContext,
  ): Promise<ReviewableRule> {
    this.assertTenantAccess(caller, tenantId);

    if (!request.reason) {
      throw new ValidationError('Reject requires reason (BR-022)');
    }

    const rule = await this.getRule(ruleId, policyId, tenantId);
    const now = new Date().toISOString();

    const updated: ReviewableRule = {
      ...rule,
      review_status: 'Rejected',
      version: rule.version + 1,
    };

    const result = await this.ruleRepo.update(updated);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'RuleRejected',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'review-service',
      payload: { rule_id: ruleId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(
      this.buildAudit(caller, 'PolicyRule', ruleId, 'RuleRejected'),
    );

    return result;
  }

  /**
   * Complete a review session (BR-023, BR-024).
   */
  async completeReview(
    reviewId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ReviewSessionEntity> {
    this.assertTenantAccess(caller, tenantId);

    const session = await this.sessionRepo.findById(reviewId);
    if (!session || session.tenant_id !== tenantId) {
      throw new NotFoundError('ReviewSession', reviewId);
    }

    // Validate completion rules (BR-023, BR-024)
    const rules = await this.ruleRepo.findByPolicy(session.policy_id);
    const lowConfidencePending = rules.filter(
      (r) => r.confidence < LOW_CONFIDENCE_THRESHOLD && r.review_status === 'PendingReview',
    );

    if (lowConfidencePending.length > 0) {
      throw new ReviewCompletionError(
        `Cannot complete review: ${lowConfidencePending.length} low confidence rules still pending (BR-023)`,
      );
    }

    const now = new Date().toISOString();
    const completed: ReviewSessionEntity = {
      ...session,
      status: 'Completed',
      completed_at: now,
      version: session.version + 1,
      updated_at: now,
    };

    const result = await this.sessionRepo.update(completed);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'ReviewCompleted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'review-service',
      payload: { review_id: reviewId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(
      this.buildAudit(caller, 'ReviewSession', reviewId, 'ReviewCompleted'),
    );

    return result;
  }

  private async getRule(ruleId: string, policyId: string, tenantId: string): Promise<ReviewableRule> {
    const rule = await this.ruleRepo.findById(ruleId);
    if (!rule || rule.policy_id !== policyId || rule.tenant_id !== tenantId) {
      throw new NotFoundError('PolicyRule', ruleId);
    }
    return rule;
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
