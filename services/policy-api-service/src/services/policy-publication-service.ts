import { v4 as uuidv4 } from 'uuid';
import {
  ApprovedPolicyEntity,
  PolicyComparisonEntity,
  PolicyChangeEntity,
  ComparisonResult,
  ReviewedRule,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import { ApprovedPolicyRepository } from '../repositories/approved-policy-repository';
import { ComparisonRepository } from '../repositories/comparison-repository';
import { ReviewLookup } from '../repositories/review-lookup';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * Policy Publication Service.
 *
 * Enforces:
 * - BR-019: Every policy must pass review before publication
 * - BR-028: Only approved policies may be published
 * - BR-029: Published policies are read-only
 * - BR-030: Publication generates PolicyPublished event
 * - BR-025: Every new version compared against latest approved
 * - ADR-008: Policy versions are immutable
 */
export class PolicyPublicationService {
  constructor(
    private readonly policyRepo: ApprovedPolicyRepository,
    private readonly comparisonRepo: ComparisonRepository,
    private readonly reviewLookup: ReviewLookup,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Approve a policy after review completion (BR-019).
   */
  async approvePolicy(
    enterpriseId: string,
    policyId: string,
    tenantId: string,
    versionNumber: number,
    caller: CallerContext,
  ): Promise<ApprovedPolicyEntity> {
    this.assertCanPublish(caller, tenantId);

    // Verify review is completed (BR-019)
    const review = await this.reviewLookup.findCompletedReviewByPolicy(policyId);
    if (!review) {
      throw new ValidationError('Cannot approve: review not completed (BR-019)');
    }

    // Get reviewed rules and build approved JSON
    const rules = await this.reviewLookup.findRulesByPolicy(policyId);
    const approvedJson = this.buildApprovedPolicyJson(enterpriseId, versionNumber, rules);

    const now = new Date().toISOString();
    const policy: ApprovedPolicyEntity = {
      policy_id: policyId,
      enterprise_id: enterpriseId,
      tenant_id: tenantId,
      version_number: versionNumber,
      approved_policy_json: JSON.stringify(approvedJson),
      approved_at: now,
      approved_by: caller.user_id,
      published_at: null,
      published_by: null,
      status: 'Approved',
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const created = await this.policyRepo.create(policy);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyApproved',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'policy-api-service',
      payload: { policy_id: policyId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', policyId, 'PolicyApproved'));

    return created;
  }

  /**
   * Publish an approved policy (BR-028, BR-030).
   */
  async publishPolicy(
    enterpriseId: string,
    policyId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ApprovedPolicyEntity> {
    this.assertCanPublish(caller, tenantId);

    const policy = await this.policyRepo.findById(policyId);
    if (!policy || policy.enterprise_id !== enterpriseId) {
      throw new NotFoundError('ApprovedPolicy', policyId);
    }

    if (policy.status !== 'Approved') {
      throw new ValidationError('Cannot publish: policy is not Approved (BR-028)');
    }

    // Supersede current published version (only one current per enterprise)
    const currentPublished = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (currentPublished) {
      const superseded: ApprovedPolicyEntity = {
        ...currentPublished,
        status: 'Superseded',
        version: currentPublished.version + 1,
        updated_at: new Date().toISOString(),
      };
      await this.policyRepo.update(superseded);

      await this.auditRepo.create(
        this.buildAudit(caller, 'ApprovedPolicy', currentPublished.policy_id, 'PolicySuperseded'),
      );
    }

    const now = new Date().toISOString();
    const published: ApprovedPolicyEntity = {
      ...policy,
      status: 'Published',
      published_at: now,
      published_by: caller.user_id,
      version: policy.version + 1,
      updated_at: now,
    };

    const result = await this.policyRepo.update(published);

    // Run version comparison (BR-025)
    await this.compareVersions(enterpriseId, tenantId, policy.version_number, currentPublished, caller);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyPublished',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'policy-api-service',
      payload: { policy_id: policyId, version_number: policy.version_number },
    } as unknown as BaseEvent);

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', policyId, 'PolicyPublished'));

    return result;
  }

  /**
   * Get approved policy JSON.
   */
  async getApprovedJson(
    enterpriseId: string,
    policyId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ApprovedPolicyEntity> {
    this.assertTenantAccess(caller, tenantId);

    const policy = await this.policyRepo.findById(policyId);
    if (!policy || policy.enterprise_id !== enterpriseId) {
      throw new NotFoundError('ApprovedPolicy', policyId);
    }

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', policyId, 'ApprovedJsonViewed'));

    return policy;
  }

  /**
   * Get current published policy for an enterprise.
   */
  async getCurrentPolicy(
    enterpriseId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ApprovedPolicyEntity> {
    this.assertTenantAccess(caller, tenantId);

    const current = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (!current) {
      throw new NotFoundError('ApprovedPolicy', enterpriseId);
    }
    return current;
  }

  /**
   * Get comparison data for a policy.
   */
  async getComparison(
    enterpriseId: string,
    policyId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<ComparisonResult> {
    this.assertTenantAccess(caller, tenantId);

    const policy = await this.policyRepo.findById(policyId);
    if (!policy || policy.enterprise_id !== enterpriseId) {
      throw new NotFoundError('ApprovedPolicy', policyId);
    }

    const comparison = await this.comparisonRepo.findComparisonByPolicy(enterpriseId, policy.version_number);
    if (!comparison) {
      return { comparison_id: '', old_version: null, new_version: policy.version_number, added: [], removed: [], modified: [] };
    }

    const changes = await this.comparisonRepo.findByComparison(comparison.comparison_id);

    await this.auditRepo.create(this.buildAudit(caller, 'PolicyComparison', comparison.comparison_id, 'ComparisonViewed'));

    return {
      comparison_id: comparison.comparison_id,
      old_version: comparison.old_version,
      new_version: comparison.new_version,
      added: changes.filter((c) => c.change_type === 'Added'),
      removed: changes.filter((c) => c.change_type === 'Removed'),
      modified: changes.filter((c) => c.change_type === 'Modified'),
    };
  }

  /**
   * Compare new version with previous published version.
   */
  private async compareVersions(
    enterpriseId: string,
    tenantId: string,
    newVersion: number,
    previousPolicy: ApprovedPolicyEntity | null,
    caller: CallerContext,
  ): Promise<void> {
    const now = new Date().toISOString();
    const comparisonId = uuidv4();

    const comparison: PolicyComparisonEntity = {
      comparison_id: comparisonId,
      enterprise_id: enterpriseId,
      tenant_id: tenantId,
      old_version: previousPolicy?.version_number ?? null,
      new_version: newVersion,
      created_at: now,
    };

    await this.comparisonRepo.createComparison(comparison);

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyComparisonStarted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'policy-api-service',
      payload: { enterprise_id: enterpriseId, old_version: previousPolicy?.version_number ?? 0, new_version: newVersion },
    } as unknown as BaseEvent);

    // Parse old and new rules for comparison
    const newRules = this.parseRulesFromJson(await this.policyRepo.findByEnterpriseAndVersion(enterpriseId, newVersion));
    const oldRules = previousPolicy ? this.parseRulesFromJson(previousPolicy) : [];

    const changes: PolicyChangeEntity[] = [];

    // Detect added rules (in new but not in old)
    for (const rule of newRules) {
      const match = oldRules.find((r) => r.rule_type === rule.rule_type && r.category === rule.category);
      if (!match) {
        const change: PolicyChangeEntity = {
          change_id: uuidv4(),
          comparison_id: comparisonId,
          tenant_id: tenantId,
          rule_type: rule.rule_type,
          category: rule.category,
          old_value: null,
          new_value: rule.value,
          change_type: 'Added',
          created_at: now,
        };
        changes.push(change);
      }
    }

    // Detect removed rules (in old but not in new)
    for (const rule of oldRules) {
      const match = newRules.find((r) => r.rule_type === rule.rule_type && r.category === rule.category);
      if (!match) {
        changes.push({
          change_id: uuidv4(),
          comparison_id: comparisonId,
          tenant_id: tenantId,
          rule_type: rule.rule_type,
          category: rule.category,
          old_value: rule.value,
          new_value: null,
          change_type: 'Removed',
          created_at: now,
        });
      }
    }

    // Detect modified rules (same type but different value)
    for (const rule of newRules) {
      const match = oldRules.find((r) => r.rule_type === rule.rule_type && r.category === rule.category);
      if (match && match.value !== rule.value) {
        changes.push({
          change_id: uuidv4(),
          comparison_id: comparisonId,
          tenant_id: tenantId,
          rule_type: rule.rule_type,
          category: rule.category,
          old_value: match.value,
          new_value: rule.value,
          change_type: 'Modified',
          created_at: now,
        });
      }
    }

    if (changes.length > 0) {
      await this.comparisonRepo.createChanges(changes);

      for (const change of changes) {
        await this.eventBus.publish({
          event_id: uuidv4(),
          event_type: 'PolicyDifferenceDetected',
          event_version: '1.0',
          timestamp: now,
          correlation_id: uuidv4(),
          tenant_id: tenantId,
          source: 'policy-api-service',
          payload: { change_id: change.change_id, rule_type: change.rule_type },
        } as unknown as BaseEvent);
      }
    }

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'PolicyComparisonCompleted',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'policy-api-service',
      payload: { comparison_id: comparisonId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(this.buildAudit(caller, 'PolicyComparison', comparisonId, 'ComparisonGenerated'));
  }

  private parseRulesFromJson(policy: ApprovedPolicyEntity | null): { rule_type: string; category: string; value: string }[] {
    if (!policy) return [];
    try {
      const json = JSON.parse(policy.approved_policy_json);
      return json.rules || [];
    } catch {
      return [];
    }
  }

  /**
   * Build approved policy JSON from reviewed rules.
   * Uses reviewer value for Modified rules, AI value for Approved, excludes Rejected.
   */
  private buildApprovedPolicyJson(
    enterpriseId: string,
    versionNumber: number,
    rules: ReviewedRule[],
  ): Record<string, unknown> {
    const approvedRules = rules
      .filter((r) => r.review_status !== 'Rejected')
      .map((r) => ({
        rule_type: r.rule_type,
        category: r.category,
        value: r.review_status === 'Modified' && r.reviewed_value ? r.reviewed_value : r.ai_generated_value,
        confidence: r.confidence,
      }));

    return {
      enterpriseId,
      policyVersion: `v${versionNumber}`,
      effectiveDate: null,
      rules: approvedRules,
      air: Object.fromEntries(approvedRules.filter((r) => r.category === 'Air').map((r) => [r.rule_type, r.value])),
      hotel: Object.fromEntries(approvedRules.filter((r) => r.category === 'Hotel').map((r) => [r.rule_type, r.value])),
      rail: Object.fromEntries(approvedRules.filter((r) => r.category === 'Rail').map((r) => [r.rule_type, r.value])),
      car: Object.fromEntries(approvedRules.filter((r) => r.category === 'Car').map((r) => [r.rule_type, r.value])),
      general: Object.fromEntries(approvedRules.filter((r) => r.category === 'General').map((r) => [r.rule_type, r.value])),
    };
  }

  private assertCanPublish(caller: CallerContext, tenantId: string): void {
    this.assertTenantAccess(caller, tenantId);
    if (caller.role !== 'SystemAdmin' && caller.role !== 'TMCAdmin') {
      throw new ForbiddenError('Only SystemAdmin or TMCAdmin can approve/publish policies');
    }
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
