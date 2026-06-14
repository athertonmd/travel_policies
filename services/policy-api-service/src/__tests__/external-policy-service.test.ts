import { describe, it, expect, beforeEach } from 'vitest';
import { ExternalPolicyService } from '../services/external-policy-service';
import { InMemoryApprovedPolicyRepository } from '../repositories/in-memory/in-memory-approved-policy-repository';
import { InMemoryComparisonRepository } from '../repositories/in-memory/in-memory-comparison-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { InMemoryAuthProvider } from '../middleware/auth';
import { InMemoryRateLimiter } from '../middleware/rate-limiter';
import { CallerContext, ApprovedPolicyEntity } from '../domain/types';

describe('ExternalPolicyService', () => {
  let policyRepo: InMemoryApprovedPolicyRepository;
  let comparisonRepo: InMemoryComparisonRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let authProvider: InMemoryAuthProvider;
  let rateLimiter: InMemoryRateLimiter;
  let service: ExternalPolicyService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const policyId = '550e8400-e29b-41d4-a716-446655440020';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const apiConsumer: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: tenantId,
    role: 'ReadOnly',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'ReadOnly',
  };

  const publishedPolicy: ApprovedPolicyEntity = {
    policy_id: policyId,
    enterprise_id: enterpriseId,
    tenant_id: tenantId,
    version_number: 2,
    approved_policy_json: JSON.stringify({
      enterpriseId,
      policyVersion: 'v2',
      effectiveDate: '2024-06-01',
      rules: [
        { rule_type: 'AIR_001', category: 'Air', value: 'Lowest logical fare', confidence: 97 },
        { rule_type: 'AIR_008', category: 'Air', value: '6 hours', confidence: 85 },
        { rule_type: 'HOTEL_001', category: 'Hotel', value: '£200', confidence: 95 },
      ],
      air: { AIR_001: 'Lowest logical fare', AIR_008: '6 hours' },
      hotel: { HOTEL_001: '£200' },
      rail: {},
      car: {},
      general: {},
    }),
    approved_at: '2024-06-01T10:00:00.000Z',
    approved_by: 'admin-user',
    published_at: '2024-06-01T12:00:00.000Z',
    published_by: 'admin-user',
    status: 'Published',
    version: 2,
    created_at: '2024-06-01T10:00:00.000Z',
    updated_at: '2024-06-01T12:00:00.000Z',
  };

  const supersededPolicy: ApprovedPolicyEntity = {
    ...publishedPolicy,
    policy_id: '550e8400-e29b-41d4-a716-446655440019',
    version_number: 1,
    approved_policy_json: JSON.stringify({
      enterpriseId,
      policyVersion: 'v1',
      effectiveDate: '2024-01-01',
      rules: [{ rule_type: 'AIR_001', category: 'Air', value: 'Lowest fare', confidence: 90 }],
      air: { AIR_001: 'Lowest fare' },
      hotel: {},
      rail: {},
      car: {},
      general: {},
    }),
    published_at: '2024-01-01T12:00:00.000Z',
    status: 'Superseded',
    version: 3,
  };

  const unpublishedPolicy: ApprovedPolicyEntity = {
    ...publishedPolicy,
    policy_id: '550e8400-e29b-41d4-a716-446655440025',
    version_number: 3,
    status: 'Approved',
    published_at: null,
    published_by: null,
  };

  beforeEach(async () => {
    policyRepo = new InMemoryApprovedPolicyRepository();
    comparisonRepo = new InMemoryComparisonRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    authProvider = new InMemoryAuthProvider();
    rateLimiter = new InMemoryRateLimiter({ maxRequestsPerMinute: 5 });
    service = new ExternalPolicyService(policyRepo, comparisonRepo, auditRepo, eventBus);

    await policyRepo.create(supersededPolicy);
    await policyRepo.create(publishedPolicy);
    await policyRepo.create(unpublishedPolicy);

    authProvider.registerToken('valid-token', apiConsumer);
    authProvider.registerToken('admin-token', systemAdmin);
  });

  describe('Get current published policy', () => {
    it('should return the current published policy', async () => {
      const result = await service.getCurrentPolicy(enterpriseId, apiConsumer);
      expect(result.version).toBe('v2');
      expect(result.publishedAt).toBe('2024-06-01T12:00:00.000Z');
      expect(result.policy).toBeDefined();
    });

    it('should return 404 when no published policy exists', async () => {
      await expect(
        service.getCurrentPolicy('550e8400-e29b-41d4-a716-446655440999', apiConsumer),
      ).rejects.toThrow('PublishedPolicy not found');
    });
  });

  describe('Get specific published version', () => {
    it('should return a specific published version', async () => {
      const result = await service.getPolicyVersion(enterpriseId, 2, apiConsumer);
      expect(result.version).toBe('v2');
      expect(result.status).toBe('Published');
    });

    it('should return superseded versions (BR-032)', async () => {
      const result = await service.getPolicyVersion(enterpriseId, 1, apiConsumer);
      expect(result.version).toBe('v1');
      expect(result.status).toBe('Superseded');
    });

    it('should NOT return unpublished versions (BR-031)', async () => {
      await expect(
        service.getPolicyVersion(enterpriseId, 3, apiConsumer),
      ).rejects.toThrow('PublishedPolicy not found');
    });
  });

  describe('List published versions', () => {
    it('should list all published and superseded versions', async () => {
      const result = await service.listVersions(enterpriseId, apiConsumer);
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe('v1');
      expect(result[0].status).toBe('Superseded');
      expect(result[1].version).toBe('v2');
      expect(result[1].status).toBe('Published');
    });
  });

  describe('Get policy changes', () => {
    it('should return changes when comparison exists', async () => {
      // Create a comparison
      await comparisonRepo.createComparison({
        comparison_id: 'comp1',
        enterprise_id: enterpriseId,
        tenant_id: tenantId,
        old_version: 1,
        new_version: 2,
        created_at: new Date().toISOString(),
      });
      await comparisonRepo.createChanges([
        { change_id: 'ch1', comparison_id: 'comp1', tenant_id: tenantId, rule_type: 'AIR_008', category: 'Air', old_value: '8 hours', new_value: '6 hours', change_type: 'Modified', created_at: new Date().toISOString() },
        { change_id: 'ch2', comparison_id: 'comp1', tenant_id: tenantId, rule_type: 'HOTEL_001', category: 'Hotel', old_value: null, new_value: '£200', change_type: 'Added', created_at: new Date().toISOString() },
      ]);

      const result = await service.getChanges(enterpriseId, apiConsumer);
      expect(result).toHaveLength(2);
      expect(result[0].changeType).toBe('Modified');
      expect(result[1].changeType).toBe('Added');
    });

    it('should return empty array when no comparison exists', async () => {
      const result = await service.getChanges(enterpriseId, apiConsumer);
      expect(result).toHaveLength(0);
    });
  });

  describe('Get policy metadata', () => {
    it('should return metadata for current policy', async () => {
      const result = await service.getMetadata(enterpriseId, apiConsumer);
      expect(result.enterpriseId).toBe(enterpriseId);
      expect(result.currentVersion).toBe('v2');
      expect(result.effectiveDate).toBe('2024-06-01');
      expect(result.approvedAt).toBe('2024-06-01T10:00:00.000Z');
      expect(result.publishedAt).toBe('2024-06-01T12:00:00.000Z');
    });
  });

  describe('Export policy JSON', () => {
    it('should export the current policy as JSON', async () => {
      const result = await service.exportPolicy(enterpriseId, apiConsumer);
      expect(result.enterpriseId).toBe(enterpriseId);
      expect(result.policyVersion).toBe('v2');
      expect(result.air).toBeDefined();
    });
  });

  describe('Prevent access to unpublished policy', () => {
    it('should not expose unpublished policy via version endpoint', async () => {
      await expect(
        service.getPolicyVersion(enterpriseId, 3, apiConsumer),
      ).rejects.toThrow('not found');
    });
  });

  describe('Prevent cross-tenant access (BR-034)', () => {
    it('should deny cross-tenant current policy access', async () => {
      await expect(
        service.getCurrentPolicy(enterpriseId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should deny cross-tenant version access', async () => {
      await expect(
        service.getPolicyVersion(enterpriseId, 2, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should deny cross-tenant export access', async () => {
      await expect(
        service.exportPolicy(enterpriseId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('Authentication required', () => {
    it('should authenticate valid tokens', async () => {
      const result = await authProvider.authenticate('Bearer valid-token');
      expect(result).not.toBeNull();
      expect(result?.user_id).toBe(apiConsumer.user_id);
    });

    it('should reject invalid tokens', async () => {
      const result = await authProvider.authenticate('Bearer invalid');
      expect(result).toBeNull();
    });

    it('should reject missing token', async () => {
      const result = await authProvider.authenticate(undefined);
      expect(result).toBeNull();
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to access any tenant policy', async () => {
      const result = await service.getCurrentPolicy(enterpriseId, systemAdmin);
      expect(result.version).toBe('v2');
    });

    it('should allow SystemAdmin to export any tenant policy', async () => {
      const result = await service.exportPolicy(enterpriseId, systemAdmin);
      expect(result.enterpriseId).toBe(enterpriseId);
    });
  });

  describe('Rate limit behaviour', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(tenantId)).toBe(true);
      }
    });

    it('should reject requests exceeding limit', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(tenantId);
      }
      expect(rateLimiter.isAllowed(tenantId)).toBe(false);
    });

    it('should track limits per tenant', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(tenantId);
      }
      // Other tenant should still be allowed
      expect(rateLimiter.isAllowed(otherTenantId)).toBe(true);
    });
  });

  describe('Audit logging', () => {
    it('should audit current policy retrieval', async () => {
      await service.getCurrentPolicy(enterpriseId, apiConsumer);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'CurrentPolicyRetrieved')).toBe(true);
    });

    it('should audit policy version retrieval', async () => {
      await service.getPolicyVersion(enterpriseId, 2, apiConsumer);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicyVersionRetrieved')).toBe(true);
    });

    it('should audit policy export', async () => {
      await service.exportPolicy(enterpriseId, apiConsumer);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicyExported')).toBe(true);
    });

    it('should audit metadata retrieval', async () => {
      await service.getMetadata(enterpriseId, apiConsumer);
      const audits = await auditRepo.findByEntity('ApprovedPolicy', policyId);
      expect(audits.some((a) => a.action === 'PolicyMetadataRetrieved')).toBe(true);
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyRetrieved on current policy access', async () => {
      await service.getCurrentPolicy(enterpriseId, apiConsumer);
      expect(eventBus.getEventsByType('PolicyRetrieved')).toHaveLength(1);
    });

    it('should emit PolicyViewed on version access', async () => {
      await service.getPolicyVersion(enterpriseId, 2, apiConsumer);
      expect(eventBus.getEventsByType('PolicyViewed')).toHaveLength(1);
    });

    it('should emit PolicyExported on export', async () => {
      await service.exportPolicy(enterpriseId, apiConsumer);
      expect(eventBus.getEventsByType('PolicyExported')).toHaveLength(1);
    });
  });
});
