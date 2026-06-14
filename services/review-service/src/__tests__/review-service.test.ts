import { describe, it, expect, beforeEach } from 'vitest';
import { ReviewService } from '../services/review-service';
import { InMemoryReviewSessionRepository } from '../repositories/in-memory/in-memory-review-session-repository';
import { InMemoryRuleRepository } from '../repositories/in-memory/in-memory-rule-repository';
import { InMemoryCorrectionRepository } from '../repositories/in-memory/in-memory-correction-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, ReviewableRule } from '../domain/types';

describe('ReviewService', () => {
  let sessionRepo: InMemoryReviewSessionRepository;
  let ruleRepo: InMemoryRuleRepository;
  let correctionRepo: InMemoryCorrectionRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: ReviewService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const policyId = '550e8400-e29b-41d4-a716-446655440020';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const reviewer: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: tenantId,
    role: 'Reviewer',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'Reviewer',
  };

  const highConfRule: ReviewableRule = {
    rule_id: '550e8400-e29b-41d4-a716-446655440060',
    policy_id: policyId,
    tenant_id: tenantId,
    rule_type: 'AIR_001',
    category: 'Air',
    value: 'Lowest logical fare required',
    confidence: 97,
    source_reference: JSON.stringify({ document_id: 'doc1', page_number: 1, paragraph_reference: '1.1', source_text: 'All flights at lowest fare.', character_start: 0, character_end: 27 }),
    ai_generated_value: 'Lowest logical fare required',
    reviewed_value: null,
    review_status: 'PendingReview',
    version: 1,
  };

  const lowConfRule: ReviewableRule = {
    rule_id: '550e8400-e29b-41d4-a716-446655440061',
    policy_id: policyId,
    tenant_id: tenantId,
    rule_type: 'HOTEL_004',
    category: 'Hotel',
    value: 'Marriott',
    confidence: 72,
    source_reference: JSON.stringify({ document_id: 'doc1', page_number: 2, paragraph_reference: '2.1', source_text: 'Preferred chain is Marriott.', character_start: null, character_end: null }),
    ai_generated_value: 'Marriott',
    reviewed_value: null,
    review_status: 'PendingReview',
    version: 1,
  };

  beforeEach(() => {
    sessionRepo = new InMemoryReviewSessionRepository();
    ruleRepo = new InMemoryRuleRepository();
    correctionRepo = new InMemoryCorrectionRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new ReviewService(sessionRepo, ruleRepo, correctionRepo, auditRepo, eventBus);

    ruleRepo.addRule(highConfRule);
    ruleRepo.addRule(lowConfRule);
  });

  describe('Starting review', () => {
    it('should create a review session with InProgress status', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      expect(session.review_id).toBeDefined();
      expect(session.status).toBe('InProgress');
      expect(session.policy_id).toBe(policyId);
      expect(session.reviewer_id).toBe(reviewer.user_id);
    });

    it('should emit ReviewStarted event', async () => {
      await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      const events = eventBus.getEventsByType('ReviewStarted');
      expect(events).toHaveLength(1);
    });
  });

  describe('Getting review items', () => {
    it('should return side-by-side review data', async () => {
      const items = await service.getReviewItems(policyId, tenantId, reviewer);
      expect(items).toHaveLength(2);
      expect(items[0].source.page_number).toBe(1);
      expect(items[0].extraction.ai_generated_value).toBe('Lowest logical fare required');
      expect(items[1].confidence).toBe(72);
    });
  });

  describe('Approving rule', () => {
    it('should approve a rule', async () => {
      const result = await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      expect(result.review_status).toBe('Approved');
      expect(result.reviewed_value).toBe(highConfRule.ai_generated_value);
    });

    it('should emit RuleApproved event', async () => {
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      const events = eventBus.getEventsByType('RuleApproved');
      expect(events).toHaveLength(1);
    });
  });

  describe('Modifying rule', () => {
    it('should modify a rule with new value', async () => {
      const result = await service.modifyRule(
        policyId, lowConfRule.rule_id, tenantId,
        { reviewer_value: 'Marriott and Hilton', reason: 'Multiple chains preferred' },
        reviewer,
      );
      expect(result.review_status).toBe('Modified');
      expect(result.reviewed_value).toBe('Marriott and Hilton');
    });

    it('should reject modify without reason (BR-021)', async () => {
      await expect(
        service.modifyRule(policyId, lowConfRule.rule_id, tenantId, { reviewer_value: 'X', reason: '' }, reviewer),
      ).rejects.toThrow('Modify requires reviewer_value and reason');
    });

    it('should emit RuleModified event', async () => {
      await service.modifyRule(
        policyId, lowConfRule.rule_id, tenantId,
        { reviewer_value: 'Hilton', reason: 'Correction' },
        reviewer,
      );
      const events = eventBus.getEventsByType('RuleModified');
      expect(events).toHaveLength(1);
    });
  });

  describe('Correction record creation (ADR-009)', () => {
    it('should create RuleCorrection when modifying', async () => {
      await service.modifyRule(
        policyId, lowConfRule.rule_id, tenantId,
        { reviewer_value: 'Hilton', reason: 'Wrong chain' },
        reviewer,
      );
      const corrections = await correctionRepo.findByRule(lowConfRule.rule_id);
      expect(corrections).toHaveLength(1);
      expect(corrections[0].ai_value).toBe('Marriott');
      expect(corrections[0].reviewer_value).toBe('Hilton');
      expect(corrections[0].reason).toBe('Wrong chain');
      expect(corrections[0].reviewer).toBe(reviewer.user_id);
    });
  });

  describe('Rejecting rule', () => {
    it('should reject a rule', async () => {
      const result = await service.rejectRule(
        policyId, highConfRule.rule_id, tenantId,
        { reason: 'Not applicable to this enterprise' },
        reviewer,
      );
      expect(result.review_status).toBe('Rejected');
    });

    it('should reject without reason (BR-022)', async () => {
      await expect(
        service.rejectRule(policyId, highConfRule.rule_id, tenantId, { reason: '' }, reviewer),
      ).rejects.toThrow('Reject requires reason');
    });

    it('should emit RuleRejected event', async () => {
      await service.rejectRule(
        policyId, highConfRule.rule_id, tenantId,
        { reason: 'Invalid' },
        reviewer,
      );
      const events = eventBus.getEventsByType('RuleRejected');
      expect(events).toHaveLength(1);
    });
  });

  describe('Completing valid review', () => {
    it('should complete review when all low confidence rules assessed', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);

      // Assess both rules (low confidence one is mandatory)
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      await service.approveRule(policyId, lowConfRule.rule_id, tenantId, reviewer);

      const completed = await service.completeReview(session.review_id, tenantId, reviewer);
      expect(completed.status).toBe('Completed');
      expect(completed.completed_at).not.toBeNull();
    });

    it('should emit ReviewCompleted event', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      await service.approveRule(policyId, lowConfRule.rule_id, tenantId, reviewer);
      await service.completeReview(session.review_id, tenantId, reviewer);
      const events = eventBus.getEventsByType('ReviewCompleted');
      expect(events).toHaveLength(1);
    });
  });

  describe('Preventing completion with low-confidence pending items (BR-023)', () => {
    it('should prevent completion when low confidence rules are still pending', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      // Only approve the high confidence rule, leave low confidence pending
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);

      await expect(
        service.completeReview(session.review_id, tenantId, reviewer),
      ).rejects.toThrow('low confidence rules still pending');
    });
  });

  describe('Event emission', () => {
    it('should emit all review lifecycle events', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      await service.modifyRule(policyId, lowConfRule.rule_id, tenantId, { reviewer_value: 'Fixed', reason: 'Correction' }, reviewer);
      await service.completeReview(session.review_id, tenantId, reviewer);

      expect(eventBus.getEventsByType('ReviewStarted')).toHaveLength(1);
      expect(eventBus.getEventsByType('RuleApproved')).toHaveLength(1);
      expect(eventBus.getEventsByType('RuleModified')).toHaveLength(1);
      expect(eventBus.getEventsByType('ReviewCompleted')).toHaveLength(1);
    });
  });

  describe('Audit logging', () => {
    it('should audit review started', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, reviewer);
      const audits = await auditRepo.findByEntity('ReviewSession', session.review_id);
      expect(audits.some((a) => a.action === 'ReviewStarted')).toBe(true);
    });

    it('should audit rule approved', async () => {
      await service.approveRule(policyId, highConfRule.rule_id, tenantId, reviewer);
      const audits = await auditRepo.findByEntity('PolicyRule', highConfRule.rule_id);
      expect(audits.some((a) => a.action === 'RuleApproved')).toBe(true);
    });

    it('should audit rule modified', async () => {
      await service.modifyRule(policyId, lowConfRule.rule_id, tenantId, { reviewer_value: 'X', reason: 'Y' }, reviewer);
      const audits = await auditRepo.findByEntity('PolicyRule', lowConfRule.rule_id);
      expect(audits.some((a) => a.action === 'RuleModified')).toBe(true);
    });

    it('should audit rule rejected', async () => {
      await service.rejectRule(policyId, highConfRule.rule_id, tenantId, { reason: 'Bad' }, reviewer);
      const audits = await auditRepo.findByEntity('PolicyRule', highConfRule.rule_id);
      expect(audits.some((a) => a.action === 'RuleRejected')).toBe(true);
    });

    it('should audit review item viewed', async () => {
      await service.getReviewItems(policyId, tenantId, reviewer);
      const audits = await auditRepo.findByEntity('ReviewItem', policyId);
      expect(audits.some((a) => a.action === 'ReviewItemViewed')).toBe(true);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant review start', async () => {
      await expect(
        service.startReview(enterpriseId, policyId, tenantId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant rule approval', async () => {
      await expect(
        service.approveRule(policyId, highConfRule.rule_id, tenantId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant review items', async () => {
      await expect(
        service.getReviewItems(policyId, tenantId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to start review on any tenant', async () => {
      const session = await service.startReview(enterpriseId, policyId, tenantId, systemAdmin);
      expect(session.review_id).toBeDefined();
    });

    it('should allow SystemAdmin to approve rules on any tenant', async () => {
      const result = await service.approveRule(policyId, highConfRule.rule_id, tenantId, systemAdmin);
      expect(result.review_status).toBe('Approved');
    });
  });
});
