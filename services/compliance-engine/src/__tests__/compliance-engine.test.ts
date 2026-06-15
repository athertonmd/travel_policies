import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceEvaluationService } from '../services/compliance-evaluation-service';
import { InMemoryPolicyLookup } from '../repositories/in-memory/in-memory-policy-lookup';
import { InMemoryEvaluationRepository } from '../repositories/in-memory/in-memory-evaluation-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { calculateScore } from '../domain/scoring';
import { CallerContext, PolicyRuleValue } from '../domain/types';

describe('ComplianceEvaluationService', () => {
  let policyLookup: InMemoryPolicyLookup;
  let evaluationRepo: InMemoryEvaluationRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: ComplianceEvaluationService;

  const tenantId = 'tenant-1';
  const enterpriseId = 'enterprise-1';
  const caller: CallerContext = { user_id: 'user-1', tenant_id: tenantId, role: 'TMCAdmin' };
  const systemAdmin: CallerContext = { user_id: 'admin', tenant_id: 'admin', role: 'SystemAdmin' };
  const otherTenant: CallerContext = { user_id: 'user-2', tenant_id: 'other', role: 'TMCAdmin' };

  const policyRules: PolicyRuleValue[] = [
    { rule_type: 'AIR_008', category: 'Air', value: '8' },
    { rule_type: 'AIR_006', category: 'Air', value: '4' },
    { rule_type: 'AIR_011', category: 'Air', value: 'BA, LH, AF' },
    { rule_type: 'AIR_002', category: 'Air', value: '14' },
    { rule_type: 'HOTEL_001', category: 'Hotel', value: '200' },
    { rule_type: 'HOTEL_004', category: 'Hotel', value: 'Marriott, Hilton' },
    { rule_type: 'HOTEL_013', category: 'Hotel', value: '3' },
    { rule_type: 'RAIL_003', category: 'Rail', value: '2' },
    { rule_type: 'CAR_001', category: 'Car', value: 'Compact, Standard, SUV' },
    { rule_type: 'CAR_002', category: 'Car', value: 'Hertz, Avis' },
    { rule_type: 'CAR_005', category: 'Car', value: 'preferred' },
    { rule_type: 'GEN_001', category: 'General', value: 'Required' },
    { rule_type: 'GEN_005', category: 'General', value: 'A, B, C, D' },
  ];

  beforeEach(() => {
    policyLookup = new InMemoryPolicyLookup();
    evaluationRepo = new InMemoryEvaluationRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new ComplianceEvaluationService(policyLookup, evaluationRepo, auditRepo, eventBus);
    policyLookup.setPolicy(enterpriseId, policyRules, 'v5');
  });

  describe('Air - Business class threshold', () => {
    it('should fail when flight too short for business', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Business', durationHours: 5 } }, caller);
      expect(result.violations.some((v) => v.ruleType === 'AIR_008')).toBe(true);
      expect(result.compliant).toBe(false);
    });

    it('should pass when flight meets threshold', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Business', durationHours: 10 } }, caller);
      expect(result.violations).toHaveLength(0);
      expect(result.evaluatedRules.some((r) => r.ruleType === 'AIR_008' && r.outcome === 'Pass')).toBe(true);
    });
  });

  describe('Air - Premium economy threshold', () => {
    it('should warn when PE flight too short', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Premium Economy', durationHours: 2 } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'AIR_006')).toBe(true);
    });
  });

  describe('Air - Preferred airline', () => {
    it('should warn for non-preferred airline', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { airline: 'RyanAir' } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'AIR_011')).toBe(true);
    });

    it('should pass for preferred airline', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, caller);
      expect(result.evaluatedRules.some((r) => r.ruleType === 'AIR_011' && r.outcome === 'Pass')).toBe(true);
    });
  });

  describe('Air - Advance purchase', () => {
    it('should warn for late booking', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { bookingLeadDays: 3 } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'AIR_002')).toBe(true);
    });
  });

  describe('Hotel - Hotel cap', () => {
    it('should fail when rate exceeds cap', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { hotel: { nightlyRate: 350 } }, caller);
      expect(result.violations.some((v) => v.ruleType === 'HOTEL_001')).toBe(true);
    });

    it('should pass when rate within cap', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { hotel: { nightlyRate: 180 } }, caller);
      expect(result.evaluatedRules.some((r) => r.ruleType === 'HOTEL_001' && r.outcome === 'Pass')).toBe(true);
    });
  });

  describe('Hotel - Preferred chain', () => {
    it('should warn for non-preferred chain', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { hotel: { hotelChain: 'Accor' } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'HOTEL_004')).toBe(true);
    });
  });

  describe('Hotel - Star rating', () => {
    it('should warn for low star rating', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { hotel: { starRating: 2 } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'HOTEL_013')).toBe(true);
    });
  });

  describe('Rail - Class of service', () => {
    it('should fail first class on short journey', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { rail: { classOfService: 'First', durationHours: 1 } }, caller);
      expect(result.violations.some((v) => v.ruleType === 'RAIL_003')).toBe(true);
    });
  });

  describe('Car - Vehicle category', () => {
    it('should fail non-allowed vehicle category', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { car: { vehicleCategory: 'Luxury' } }, caller);
      expect(result.violations.some((v) => v.ruleType === 'CAR_001')).toBe(true);
    });
  });

  describe('Car - Preferred supplier', () => {
    it('should warn for non-preferred supplier', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { car: { supplier: 'Budget' } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'CAR_002')).toBe(true);
    });
  });

  describe('Car - EV preference', () => {
    it('should warn when non-EV selected', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { car: { electricVehicle: false } }, caller);
      expect(result.warnings.some((w) => w.ruleType === 'CAR_005')).toBe(true);
    });
  });

  describe('General - Executive exception', () => {
    it('should note executive entitlements', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { traveller: { executiveFlag: true } }, caller);
      expect(result.evaluatedRules.some((r) => r.ruleType === 'GEN_003' && r.outcome === 'Pass')).toBe(true);
    });
  });

  describe('Compliance scoring', () => {
    it('should return 100 for fully compliant booking', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Business', durationHours: 10 } }, caller);
      expect(result.score).toBe(100);
    });

    it('should deduct 25 per violation', () => {
      expect(calculateScore([{ ruleType: 'X', outcome: 'Fail', message: '', actualValue: 0, requiredValue: 0, policyVersion: '' }])).toBe(75);
    });

    it('should deduct 10 per warning', () => {
      expect(calculateScore([{ ruleType: 'X', outcome: 'Warning', message: '', actualValue: 0, requiredValue: 0, policyVersion: '' }])).toBe(90);
    });

    it('should not go below 0', () => {
      const many = Array.from({ length: 10 }, () => ({ ruleType: 'X', outcome: 'Fail' as const, message: '', actualValue: 0, requiredValue: 0, policyVersion: '' }));
      expect(calculateScore(many)).toBe(0);
    });
  });

  describe('Explanation generation', () => {
    it('should include human-readable explanation in violations', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Business', durationHours: 5 } }, caller);
      expect(result.violations[0].message).toContain('Business class requires');
      expect(result.violations[0].message).toContain('5');
    });
  });

  describe('Evaluation history', () => {
    it('should store evaluation results', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, caller);
      const stored = await service.getEvaluation(result.evaluation_id, tenantId, caller);
      expect(stored.evaluation_id).toBe(result.evaluation_id);
    });

    it('should list evaluations for enterprise', async () => {
      await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, caller);
      await service.evaluate(enterpriseId, tenantId, { hotel: { nightlyRate: 150 } }, caller);
      const list = await service.getEvaluations(enterpriseId, tenantId, caller);
      expect(list).toHaveLength(2);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant evaluation', async () => {
      await expect(service.evaluate(enterpriseId, tenantId, {}, otherTenant)).rejects.toThrow('Cross-tenant');
    });

    it('should allow SystemAdmin', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, systemAdmin);
      expect(result).toBeDefined();
    });
  });

  describe('Audit logging', () => {
    it('should audit evaluation executed', async () => {
      const result = await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, caller);
      const audits = await auditRepo.findByEntity('ComplianceEvaluation', result.evaluation_id);
      expect(audits.some((a) => a.action === 'EvaluationExecuted')).toBe(true);
    });
  });

  describe('Event emission', () => {
    it('should emit ComplianceEvaluationStarted and Completed', async () => {
      await service.evaluate(enterpriseId, tenantId, { air: { airline: 'BA' } }, caller);
      expect(eventBus.getEventsByType('ComplianceEvaluationStarted')).toHaveLength(1);
      expect(eventBus.getEventsByType('ComplianceEvaluationCompleted')).toHaveLength(1);
    });

    it('should emit ComplianceViolationDetected for violations', async () => {
      await service.evaluate(enterpriseId, tenantId, { air: { cabinClass: 'Business', durationHours: 3 } }, caller);
      expect(eventBus.getEventsByType('ComplianceViolationDetected')).toHaveLength(1);
    });

    it('should emit ComplianceWarningDetected for warnings', async () => {
      await service.evaluate(enterpriseId, tenantId, { air: { airline: 'RyanAir' } }, caller);
      expect(eventBus.getEventsByType('ComplianceWarningDetected')).toHaveLength(1);
    });
  });
});
