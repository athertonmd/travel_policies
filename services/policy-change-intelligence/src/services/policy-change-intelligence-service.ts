import { v4 as uuidv4 } from 'uuid';
import { ChangeSummary, PolicyChangeInput, CallerContext, AuditEntry } from '../domain/types';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { PolicyChangeAnalysisProvider } from '../ai/change-analysis-provider';
import { SummaryRepository } from '../repositories/summary-repository';
import { AuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

export class PolicyChangeIntelligenceService {
  constructor(
    private readonly aiProvider: PolicyChangeAnalysisProvider,
    private readonly summaryRepo: SummaryRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  async generateSummary(
    enterpriseId: string,
    tenantId: string,
    policyId: string,
    comparisonId: string,
    changes: PolicyChangeInput[],
    caller: CallerContext,
  ): Promise<ChangeSummary> {
    this.assertAccess(caller, tenantId);

    const result = await this.aiProvider.generateSummary(enterpriseId, comparisonId, changes);

    const summary: ChangeSummary = {
      summary_id: uuidv4(),
      enterprise_id: enterpriseId,
      tenant_id: tenantId,
      comparison_id: comparisonId,
      policy_id: policyId,
      ...result,
    };

    await this.summaryRepo.save(summary);

    await this.eventBus.publish({
      event_id: uuidv4(), event_type: 'PolicyChangeSummaryGenerated', event_version: '1.0',
      timestamp: new Date().toISOString(), correlation_id: uuidv4(),
      tenant_id: tenantId, source: 'policy-change-intelligence',
      payload: { summary_id: summary.summary_id, enterprise_id: enterpriseId },
    } as unknown as BaseEvent);

    await this.auditRepo.create(this.buildAudit(caller, 'ChangeSummary', summary.summary_id, 'SummaryGenerated'));

    return summary;
  }

  async getSummary(policyId: string, tenantId: string, caller: CallerContext): Promise<ChangeSummary> {
    this.assertAccess(caller, tenantId);
    const summary = await this.summaryRepo.findByPolicy(policyId);
    if (!summary) throw new NotFoundError('ChangeSummary', policyId);
    if (summary.tenant_id !== tenantId && caller.role !== 'SystemAdmin') {
      throw new ForbiddenError('Cross-tenant access denied');
    }
    await this.auditRepo.create(this.buildAudit(caller, 'ChangeSummary', summary.summary_id, 'SummaryViewed'));
    return summary;
  }

  async getImpactAnalysis(policyId: string, tenantId: string, caller: CallerContext): Promise<{ impacts: string[]; risks: string[]; recommendations: string[] }> {
    this.assertAccess(caller, tenantId);
    const summary = await this.summaryRepo.findByPolicy(policyId);
    if (!summary) throw new NotFoundError('ChangeSummary', policyId);
    await this.auditRepo.create(this.buildAudit(caller, 'ChangeSummary', summary.summary_id, 'ImpactAnalysisViewed'));
    return { impacts: summary.potential_impacts, risks: summary.risks, recommendations: summary.recommendations };
  }

  private assertAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) throw new ForbiddenError('Cross-tenant access denied');
  }

  private buildAudit(caller: CallerContext, entityType: string, entityId: string, action: string): AuditEntry {
    return { audit_id: uuidv4(), tenant_id: caller.tenant_id, user_id: caller.user_id, entity_type: entityType, entity_id: entityId, action, timestamp: new Date().toISOString() };
  }
}
