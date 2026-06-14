import { v4 as uuidv4 } from 'uuid';
import {
  ApprovedPolicyEntity,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { NotFoundError, ForbiddenError } from '../domain/errors';
import { ApprovedPolicyRepository } from '../repositories/approved-policy-repository';
import { ComparisonRepository } from '../repositories/comparison-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * External Policy Service — public API for third-party systems.
 *
 * Only exposes published policies (BR-031).
 * Enforces tenant isolation (BR-033, BR-034).
 * All requests must be authenticated (BR-038).
 */
export class ExternalPolicyService {
  constructor(
    private readonly policyRepo: ApprovedPolicyRepository,
    private readonly comparisonRepo: ComparisonRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Get current published policy (BR-031).
   */
  async getCurrentPolicy(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<{ enterpriseId: string; version: string; effectiveDate: string | null; publishedAt: string | null; policy: Record<string, unknown> }> {
    this.assertTenantAccess(caller, caller.tenant_id);

    const policy = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (!policy) {
      throw new NotFoundError('PublishedPolicy', enterpriseId);
    }

    this.assertPolicyTenantAccess(caller, policy);

    await this.emitAndAudit(caller, policy.policy_id, 'PolicyRetrieved', 'CurrentPolicyRetrieved');

    const policyJson = JSON.parse(policy.approved_policy_json);
    return {
      enterpriseId: policy.enterprise_id,
      version: `v${policy.version_number}`,
      effectiveDate: policyJson.effectiveDate ?? null,
      publishedAt: policy.published_at,
      policy: policyJson,
    };
  }

  /**
   * Get specific published version (BR-032).
   */
  async getPolicyVersion(
    enterpriseId: string,
    version: number,
    caller: CallerContext,
  ): Promise<{ enterpriseId: string; version: string; status: string; policy: Record<string, unknown> }> {
    this.assertTenantAccess(caller, caller.tenant_id);

    const policy = await this.policyRepo.findByEnterpriseAndVersion(enterpriseId, version);
    if (!policy || (policy.status !== 'Published' && policy.status !== 'Superseded')) {
      throw new NotFoundError('PublishedPolicy', `${enterpriseId}/v${version}`);
    }

    this.assertPolicyTenantAccess(caller, policy);

    await this.emitAndAudit(caller, policy.policy_id, 'PolicyViewed', 'PolicyVersionRetrieved');

    return {
      enterpriseId: policy.enterprise_id,
      version: `v${policy.version_number}`,
      status: policy.status,
      policy: JSON.parse(policy.approved_policy_json),
    };
  }

  /**
   * List published versions.
   */
  async listVersions(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<{ version: string; status: string; publishedAt: string | null }[]> {
    this.assertTenantAccess(caller, caller.tenant_id);

    // Get all versions for the enterprise (Published + Superseded only)
    const allPolicies = await this.getAllPublishedForEnterprise(enterpriseId, caller);

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', enterpriseId, 'PolicyVersionsListed'));

    return allPolicies.map((p) => ({
      version: `v${p.version_number}`,
      status: p.status,
      publishedAt: p.published_at,
    }));
  }

  /**
   * Get policy changes.
   */
  async getChanges(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<{ ruleType: string; category: string; oldValue: string | null; newValue: string | null; changeType: string }[]> {
    this.assertTenantAccess(caller, caller.tenant_id);

    const currentPolicy = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (!currentPolicy) {
      throw new NotFoundError('PublishedPolicy', enterpriseId);
    }
    this.assertPolicyTenantAccess(caller, currentPolicy);

    const comparison = await this.comparisonRepo.findComparisonByPolicy(enterpriseId, currentPolicy.version_number);
    if (!comparison) {
      return [];
    }

    const changes = await this.comparisonRepo.findByComparison(comparison.comparison_id);

    await this.auditRepo.create(this.buildAudit(caller, 'PolicyChange', enterpriseId, 'PolicyChangesRetrieved'));

    return changes.map((c) => ({
      ruleType: c.rule_type,
      category: c.category,
      oldValue: c.old_value,
      newValue: c.new_value,
      changeType: c.change_type,
    }));
  }

  /**
   * Get policy metadata.
   */
  async getMetadata(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<{ enterpriseId: string; currentVersion: string; effectiveDate: string | null; approvedAt: string; approvedBy: string; publishedAt: string | null; publishedBy: string | null }> {
    this.assertTenantAccess(caller, caller.tenant_id);

    const policy = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (!policy) {
      throw new NotFoundError('PublishedPolicy', enterpriseId);
    }
    this.assertPolicyTenantAccess(caller, policy);

    const policyJson = JSON.parse(policy.approved_policy_json);

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', policy.policy_id, 'PolicyMetadataRetrieved'));

    return {
      enterpriseId: policy.enterprise_id,
      currentVersion: `v${policy.version_number}`,
      effectiveDate: policyJson.effectiveDate ?? null,
      approvedAt: policy.approved_at,
      approvedBy: policy.approved_by,
      publishedAt: policy.published_at,
      publishedBy: policy.published_by,
    };
  }

  /**
   * Export policy JSON.
   */
  async exportPolicy(
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<Record<string, unknown>> {
    this.assertTenantAccess(caller, caller.tenant_id);

    const policy = await this.policyRepo.findCurrentByEnterprise(enterpriseId);
    if (!policy) {
      throw new NotFoundError('PublishedPolicy', enterpriseId);
    }
    this.assertPolicyTenantAccess(caller, policy);

    await this.emitAndAudit(caller, policy.policy_id, 'PolicyExported', 'PolicyExported');

    return JSON.parse(policy.approved_policy_json);
  }

  private async getAllPublishedForEnterprise(enterpriseId: string, caller: CallerContext): Promise<ApprovedPolicyEntity[]> {
    // In a real impl, this would be a repository method
    // For now, iterate known versions
    const policies: ApprovedPolicyEntity[] = [];
    for (let v = 1; v <= 100; v++) {
      const p = await this.policyRepo.findByEnterpriseAndVersion(enterpriseId, v);
      if (!p) break;
      if (p.status === 'Published' || p.status === 'Superseded') {
        this.assertPolicyTenantAccess(caller, p);
        policies.push(p);
      }
    }
    return policies;
  }

  private assertPolicyTenantAccess(caller: CallerContext, policy: ApprovedPolicyEntity): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== policy.tenant_id) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private assertTenantAccess(_caller: CallerContext, _tenantId: string): void {
    // Caller is already authenticated at this point
    // Additional tenant checks happen in assertPolicyTenantAccess
  }

  private async emitAndAudit(caller: CallerContext, entityId: string, eventType: string, auditAction: string): Promise<void> {
    const now = new Date().toISOString();

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: eventType,
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: caller.tenant_id,
      source: 'policy-api-service',
      payload: { policy_id: entityId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(this.buildAudit(caller, 'ApprovedPolicy', entityId, auditAction));
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
