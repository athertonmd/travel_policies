import { v4 as uuidv4 } from 'uuid';
import { BookingEvaluationRequest, ComplianceEvaluationResult, RuleEvaluationResult, CallerContext, AuditEntry } from '../domain/types';
import { calculateScore } from '../domain/scoring';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { AirRuleEvaluator } from '../evaluators/air-evaluator';
import { HotelRuleEvaluator } from '../evaluators/hotel-evaluator';
import { RailRuleEvaluator } from '../evaluators/rail-evaluator';
import { CarRuleEvaluator } from '../evaluators/car-evaluator';
import { GeneralRuleEvaluator } from '../evaluators/general-evaluator';
import { PolicyLookup } from '../repositories/in-memory/in-memory-policy-lookup';
import { EvaluationRepository } from '../repositories/in-memory/in-memory-evaluation-repository';
import { AuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

export class ComplianceEvaluationService {
  private evaluators = [new AirRuleEvaluator(), new HotelRuleEvaluator(), new RailRuleEvaluator(), new CarRuleEvaluator(), new GeneralRuleEvaluator()];

  constructor(
    private readonly policyLookup: PolicyLookup,
    private readonly evaluationRepo: EvaluationRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  async evaluate(enterpriseId: string, tenantId: string, booking: BookingEvaluationRequest, caller: CallerContext): Promise<ComplianceEvaluationResult> {
    this.assertAccess(caller, tenantId);

    const policy = await this.policyLookup.getPublishedRules(enterpriseId);
    if (!policy) throw new NotFoundError('PublishedPolicy', enterpriseId);

    const now = new Date().toISOString();
    await this.eventBus.publish(this.buildEvent('ComplianceEvaluationStarted', tenantId, { enterprise_id: enterpriseId }));

    const allResults: RuleEvaluationResult[] = [];
    for (const evaluator of this.evaluators) {
      allResults.push(...evaluator.evaluate(booking, policy.rules, policy.version));
    }

    const violations = allResults.filter((r) => r.outcome === 'Fail');
    const warnings = allResults.filter((r) => r.outcome === 'Warning');
    const score = calculateScore(allResults);

    const result: ComplianceEvaluationResult = {
      evaluation_id: uuidv4(),
      enterprise_id: enterpriseId,
      tenant_id: tenantId,
      compliant: violations.length === 0,
      score,
      violations,
      warnings,
      evaluatedRules: allResults,
      policyVersion: policy.version,
      evaluationTimestamp: now,
    };

    await this.evaluationRepo.save(result);

    await this.eventBus.publish(this.buildEvent('ComplianceEvaluationCompleted', tenantId, { enterprise_id: enterpriseId, evaluation_id: result.evaluation_id, score, compliant: result.compliant }));
    for (const v of violations) { await this.eventBus.publish(this.buildEvent('ComplianceViolationDetected', tenantId, { evaluation_id: result.evaluation_id, rule_type: v.ruleType })); }
    for (const w of warnings) { await this.eventBus.publish(this.buildEvent('ComplianceWarningDetected', tenantId, { evaluation_id: result.evaluation_id, rule_type: w.ruleType })); }

    await this.auditRepo.create(this.buildAudit(caller, 'ComplianceEvaluation', result.evaluation_id, 'EvaluationExecuted'));

    return result;
  }

  async getEvaluation(evaluationId: string, tenantId: string, caller: CallerContext): Promise<ComplianceEvaluationResult> {
    this.assertAccess(caller, tenantId);
    const result = await this.evaluationRepo.findById(evaluationId);
    if (!result || (result.tenant_id !== tenantId && caller.role !== 'SystemAdmin')) throw new NotFoundError('ComplianceEvaluation', evaluationId);
    await this.auditRepo.create(this.buildAudit(caller, 'ComplianceEvaluation', evaluationId, 'EvaluationViewed'));
    return result;
  }

  async getEvaluations(enterpriseId: string, tenantId: string, caller: CallerContext): Promise<ComplianceEvaluationResult[]> {
    this.assertAccess(caller, tenantId);
    return this.evaluationRepo.findByEnterprise(enterpriseId);
  }

  private assertAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) throw new ForbiddenError('Cross-tenant access denied');
  }

  private buildEvent(type: string, tenantId: string, payload: Record<string, unknown>): BaseEvent {
    return { event_id: uuidv4(), event_type: type, event_version: '1.0', timestamp: new Date().toISOString(), correlation_id: uuidv4(), tenant_id: tenantId, source: 'compliance-engine', payload } as unknown as BaseEvent;
  }

  private buildAudit(caller: CallerContext, entityType: string, entityId: string, action: string): AuditEntry {
    return { audit_id: uuidv4(), tenant_id: caller.tenant_id, user_id: caller.user_id, entity_type: entityType, entity_id: entityId, action, timestamp: new Date().toISOString() };
  }
}
