import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyPublicationService } from '../services/policy-publication-service';
import { InMemoryApprovedPolicyRepository } from '../repositories/in-memory/in-memory-approved-policy-repository';
import { InMemoryComparisonRepository } from '../repositories/in-memory/in-memory-comparison-repository';
import { InMemoryReviewLookup } from '../repositories/in-memory/in-memory-review-lookup';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, ReviewedRule } from '../domain/types';

describe('PolicyPublicationService', () => {
  let policyRepo: InMemoryApprovedPolicyRepository;
  let comparisonRepo: InMemoryComparisonRepository;
  let reviewLookup: InMemoryReviewLookup;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: PolicyPublicationService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const policyId = '550e8400-e29b-41d4-a716-446655440020';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const tmcAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: tenantId,
    role: 'TMCAdmin',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const reviewer: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440045',
    tenant_id: tenantId,
    role: 'Reviewer',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'TMCAdmin',
  };

  const reviewedRules: ReviewedRule[] = [
    { rule_id: 'r1', rule_type: 'AIR_001', category: 'Air', ai_generated_value: 'Lowest logical fare', reviewed_value: null, review_status: 'Approved', confidence: 97 },
    { rule_id: 'r2', rule_type: 'AIR_008', category: 'Air', ai_generated_value: '8 hours', reviewed_value: '6 hours', review_status: 'Modified', confidence: 85 },
    { rule_id: 'r3', rule_type: 'HOTEL_001', category: 'Hotel', ai_generated_value: '£200', reviewed_value: null, review_status: 'Approved', confidence: 95 },
    { rule_id: 'r4', rule_type: 'HOTEL_004', category: 'Hotel', ai_generated_value: 'Marriott', reviewed_value: null, review_status: 'Rejected', confidence: 72 },
  ];

  beforeEach(() => {
    policyRepo = new InMemoryApprovedPolicyRepository();
    comparisonRepo = new InMemoryComparisonRepository();
    reviewLookup = new InMemoryReviewLookup();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new PolicyPublicationService(policyRepo, comparisonRepo, reviewLookup, auditRepo, eventBus);

    // Setup: completed review
    reviewLookup.addSession({ review_id: 'rev1', policy_id: policyId, tenant_id: tenantId, status: 'Completed' });
    reviewLookup.setRulesForPolicy(policyId, reviewedRules);
  });

  describe('Approving completed reviewed policy', () => {
    it('should approve a policy with completed review', async () => {
      const result = await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      expect(result.status).toBe('Approved');
      expect(result.policy_id).toBe(policyId);
      expect(result.approved_by).toBe(tmcAdmin.user_id);
    });

    it('should emit PolicyApproved event', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      expect(eventBus.getEventsByType('PolicyApproved')).toHaveLength(1);
    });
  });

  describe('Preventing approval before review completion', () => {
    it('should reject approval without completed review', async () => {
      reviewLookup.clear();
      await expect(
        service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin),
      ).rejects.toThrow('review not completed');
    });
  });

  describe('Publishing approved policy', () => {
    it('should publish an approved policy', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      const result = await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);
      expect(result.status).toBe('Published');
      expect(result.published_at).not.toBeNull();
      expect(result.published_by).toBe(tmcAdmin.user_id);
    });

    it('should emit PolicyPublished event', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);
      expect(eventBus.getEventsByType('PolicyPublished')).toHaveLength(1);
    });
  });

  describe('Preventing publication of unapproved policy', () => {
    it('should reject publishing a non-Approved policy', async () => {
      // Create a draft policy directly
      await policyRepo.create({
        policy_id: 'draft-pol',
        enterprise_id: enterpriseId,
        tenant_id: tenantId,
        version_number: 1,
        approved_policy_json: '{}',
        approved_at: new Date().toISOString(),
        approved_by: tmcAdmin.user_id,
        published_at: null,
        published_by: null,
        status: 'Draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await expect(
        service.publishPolicy(enterpriseId, 'draft-pol', tenantId, tmcAdmin),
      ).rejects.toThrow('not Approved');
    });
  });

  describe('Generating approved policy JSON', () => {
    it('should use reviewer values for Modified rules', async () => {
      const result = await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      const json = JSON.parse(result.approved_policy_json);
      const airRules = json.rules.filter((r: { category: string }) => r.category === 'Air');
      const modifiedRule = airRules.find((r: { rule_type: string }) => r.rule_type === 'AIR_008');
      expect(modifiedRule.value).toBe('6 hours'); // reviewer value used
    });

    it('should use AI value for Approved rules', async () => {
      const result = await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      const json = JSON.parse(result.approved_policy_json);
      const airRule = json.rules.find((r: { rule_type: string }) => r.rule_type === 'AIR_001');
      expect(airRule.value).toBe('Lowest logical fare');
    });
  });

  describe('Excluding rejected rules', () => {
    it('should not include rejected rules in approved JSON', async () => {
      const result = await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      const json = JSON.parse(result.approved_policy_json);
      const rejected = json.rules.find((r: { rule_type: string }) => r.rule_type === 'HOTEL_004');
      expect(rejected).toBeUndefined();
    });
  });

  describe('Marking previous published version as superseded', () => {
    it('should supersede the current published policy', async () => {
      // Publish v1
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      // Approve and publish v2
      const policyId2 = '550e8400-e29b-41d4-a716-446655440021';
      reviewLookup.addSession({ review_id: 'rev2', policy_id: policyId2, tenant_id: tenantId, status: 'Completed' });
      await service.approvePolicy(enterpriseId, policyId2, tenantId, 2, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId2, tenantId, tmcAdmin);

      // v1 should be superseded
      const v1 = await policyRepo.findById(policyId);
      expect(v1?.status).toBe('Superseded');
    });
  });

  describe('Enforcing one current policy per enterprise', () => {
    it('should only have one Published policy per enterprise', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      const policyId2 = '550e8400-e29b-41d4-a716-446655440022';
      reviewLookup.addSession({ review_id: 'rev3', policy_id: policyId2, tenant_id: tenantId, status: 'Completed' });
      await service.approvePolicy(enterpriseId, policyId2, tenantId, 2, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId2, tenantId, tmcAdmin);

      const current = await service.getCurrentPolicy(enterpriseId, tenantId, tmcAdmin);
      expect(current.policy_id).toBe(policyId2);
    });
  });

  describe('Comparing first version with no previous version', () => {
    it('should handle first version comparison (all rules are Added)', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      // Comparison events should be emitted
      expect(eventBus.getEventsByType('PolicyComparisonStarted')).toHaveLength(1);
      expect(eventBus.getEventsByType('PolicyComparisonCompleted')).toHaveLength(1);
    });
  });

  describe('Detecting added rules', () => {
    it('should detect rules present in new but not old version', async () => {
      // First publish with 3 rules
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      // Second version with extra rule
      const policyId2 = '550e8400-e29b-41d4-a716-446655440023';
      const newRules = [...reviewedRules, { rule_id: 'r5', rule_type: 'GEN_001', category: 'General', ai_generated_value: 'Manager approval', reviewed_value: null, review_status: 'Approved', confidence: 90 }];
      reviewLookup.addSession({ review_id: 'rev4', policy_id: policyId2, tenant_id: tenantId, status: 'Completed' });
      reviewLookup.setRulesForPolicy(policyId2, newRules);
      await service.approvePolicy(enterpriseId, policyId2, tenantId, 2, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId2, tenantId, tmcAdmin);

      const diffEvents = eventBus.getEventsByType('PolicyDifferenceDetected');
      expect(diffEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Event emission', () => {
    it('should emit all publication lifecycle events', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      expect(eventBus.getEventsByType('PolicyApproved')).toHaveLength(1);
      expect(eventBus.getEventsByType('PolicyPublished')).toHaveLength(1);
      expect(eventBus.getEventsByType('PolicyComparisonStarted')).toHaveLength(1);
      expect(eventBus.getEventsByType('PolicyComparisonCompleted')).toHaveLength(1);
    });
  });

  describe('Audit logging', () => {
    it('should audit policy approval', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicyApproved')).toBe(true);
    });

    it('should audit policy publication', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicyPublished')).toBe(true);
    });

    it('should audit superseded policy', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId, tenantId, tmcAdmin);

      const policyId2 = '550e8400-e29b-41d4-a716-446655440024';
      reviewLookup.addSession({ review_id: 'rev5', policy_id: policyId2, tenant_id: tenantId, status: 'Completed' });
      await service.approvePolicy(enterpriseId, policyId2, tenantId, 2, tmcAdmin);
      await service.publishPolicy(enterpriseId, policyId2, tenantId, tmcAdmin);

      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicySuperseded')).toBe(true);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant policy approval', async () => {
      await expect(
        service.approvePolicy(enterpriseId, policyId, tenantId, 1, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent Reviewer from publishing', async () => {
      await expect(
        service.approvePolicy(enterpriseId, policyId, tenantId, 1, reviewer),
      ).rejects.toThrow('Only SystemAdmin or TMCAdmin');
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to approve any tenant policy', async () => {
      const result = await service.approvePolicy(enterpriseId, policyId, tenantId, 1, systemAdmin);
      expect(result.status).toBe('Approved');
    });

    it('should allow SystemAdmin to publish any tenant policy', async () => {
      await service.approvePolicy(enterpriseId, policyId, tenantId, 1, systemAdmin);
      const result = await service.publishPolicy(enterpriseId, policyId, tenantId, systemAdmin);
      expect(result.status).toBe('Published');
    });
  });
});
