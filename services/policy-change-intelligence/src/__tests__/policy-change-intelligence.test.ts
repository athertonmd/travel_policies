import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyChangeIntelligenceService } from '../services/policy-change-intelligence-service';
import { InMemoryChangeAnalysisProvider } from '../ai/in-memory-change-analysis-provider';
import { InMemorySummaryRepository } from '../repositories/in-memory/in-memory-summary-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { calculateSeverity, mapToChangeCategory } from '../domain/severity';
import { CallerContext, PolicyChangeInput } from '../domain/types';

describe('PolicyChangeIntelligenceService', () => {
  let aiProvider: InMemoryChangeAnalysisProvider;
  let summaryRepo: InMemorySummaryRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: PolicyChangeIntelligenceService;

  const tenantId = 'tenant-1';
  const enterpriseId = 'enterprise-1';
  const policyId = 'policy-1';
  const comparisonId = 'comparison-1';
  const caller: CallerContext = { user_id: 'user-1', tenant_id: tenantId, role: 'TMCAdmin' };
  const systemAdmin: CallerContext = { user_id: 'admin-1', tenant_id: 'admin', role: 'SystemAdmin' };
  const otherTenant: CallerContext = { user_id: 'user-2', tenant_id: 'other', role: 'TMCAdmin' };

  const sampleChanges: PolicyChangeInput[] = [
    { rule_type: 'AIR_008', category: 'Air', old_value: '10 hours', new_value: '6 hours', change_type: 'Modified' },
    { rule_type: 'HOTEL_001', category: 'Hotel', old_value: '£250', new_value: '£260', change_type: 'Modified' },
    { rule_type: 'GEN_001', category: 'General', old_value: null, new_value: 'Manager approval required', change_type: 'Added' },
  ];

  beforeEach(() => {
    aiProvider = new InMemoryChangeAnalysisProvider();
    summaryRepo = new InMemorySummaryRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new PolicyChangeIntelligenceService(aiProvider, summaryRepo, auditRepo, eventBus);
  });

  describe('Summary generation', () => {
    it('should generate a summary with key changes', async () => {
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      expect(result.summary).toContain('3 change(s)');
      expect(result.key_changes).toHaveLength(3);
    });

    it('should persist summary', async () => {
      await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      const stored = await service.getSummary(policyId, tenantId, caller);
      expect(stored).toBeDefined();
      expect(stored.key_changes).toHaveLength(3);
    });
  });

  describe('Severity scoring', () => {
    it('should classify business class threshold change as Major', () => {
      expect(calculateSeverity({ rule_type: 'AIR_008', category: 'Air', old_value: '10h', new_value: '6h', change_type: 'Modified' })).toBe('Major');
    });

    it('should classify hotel cap change as Major', () => {
      expect(calculateSeverity({ rule_type: 'HOTEL_001', category: 'Hotel', old_value: '£250', new_value: '£300', change_type: 'Modified' })).toBe('Major');
    });

    it('should classify supplier preference change as Minor', () => {
      expect(calculateSeverity({ rule_type: 'AIR_011', category: 'Air', old_value: 'BA', new_value: 'BA, LH', change_type: 'Modified' })).toBe('Minor');
    });

    it('should classify removed rules as Major', () => {
      expect(calculateSeverity({ rule_type: 'AIR_001', category: 'Air', old_value: 'Yes', new_value: null, change_type: 'Removed' })).toBe('Major');
    });

    it('should classify added rules as Moderate', () => {
      expect(calculateSeverity({ rule_type: 'RAIL_001', category: 'Rail', old_value: null, new_value: 'Standard', change_type: 'Added' })).toBe('Moderate');
    });
  });

  describe('Impact analysis', () => {
    it('should generate impacts for major changes', async () => {
      await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      const analysis = await service.getImpactAnalysis(policyId, tenantId, caller);
      expect(analysis.impacts.length).toBeGreaterThan(0);
      expect(analysis.risks.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('No-change scenario', () => {
    it('should handle empty changes', async () => {
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, [], caller);
      expect(result.summary).toContain('No changes');
      expect(result.key_changes).toHaveLength(0);
    });
  });

  describe('Large policy change scenario', () => {
    it('should handle many changes', async () => {
      const manyChanges: PolicyChangeInput[] = Array.from({ length: 20 }, (_, i) => ({
        rule_type: `AIR_${String(i + 1).padStart(3, '0')}`,
        category: 'Air',
        old_value: `old-${i}`,
        new_value: `new-${i}`,
        change_type: 'Modified' as const,
      }));
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, manyChanges, caller);
      expect(result.key_changes).toHaveLength(20);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant summary generation', async () => {
      await expect(
        service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, otherTenant),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant summary viewing', async () => {
      await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      await expect(
        service.getSummary(policyId, tenantId, otherTenant),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should allow SystemAdmin access', async () => {
      await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      const result = await service.getSummary(policyId, tenantId, systemAdmin);
      expect(result).toBeDefined();
    });
  });

  describe('Audit logging', () => {
    it('should audit summary generation', async () => {
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      const audits = await auditRepo.findByEntity('ChangeSummary', result.summary_id);
      expect(audits.some((a) => a.action === 'SummaryGenerated')).toBe(true);
    });

    it('should audit summary viewed', async () => {
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      await service.getSummary(policyId, tenantId, caller);
      const audits = await auditRepo.findByEntity('ChangeSummary', result.summary_id);
      expect(audits.some((a) => a.action === 'SummaryViewed')).toBe(true);
    });

    it('should audit impact analysis viewed', async () => {
      const result = await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      await service.getImpactAnalysis(policyId, tenantId, caller);
      const audits = await auditRepo.findByEntity('ChangeSummary', result.summary_id);
      expect(audits.some((a) => a.action === 'ImpactAnalysisViewed')).toBe(true);
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyChangeSummaryGenerated', async () => {
      await service.generateSummary(enterpriseId, tenantId, policyId, comparisonId, sampleChanges, caller);
      expect(eventBus.getEventsByType('PolicyChangeSummaryGenerated')).toHaveLength(1);
    });
  });

  describe('Change category mapping', () => {
    it('should map air rules to Air Policy', () => {
      expect(mapToChangeCategory('Air', 'AIR_001')).toBe('Air Policy');
    });
    it('should map approval rules', () => {
      expect(mapToChangeCategory('General', 'GEN_001')).toBe('Approval Policy');
    });
    it('should map supplier preferences', () => {
      expect(mapToChangeCategory('Air', 'AIR_011')).toBe('Supplier Preferences');
    });
  });
});
