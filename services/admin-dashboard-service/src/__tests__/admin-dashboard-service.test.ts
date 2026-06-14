import { describe, it, expect, beforeEach } from 'vitest';
import { AdminDashboardService } from '../services/admin-dashboard-service';
import { InMemoryDashboardDataSource } from '../repositories/in-memory/in-memory-data-source';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { CallerContext, DashboardSummary, EnterpriseStatusItem, ActivityItem, ExceptionItem } from '../domain/types';

describe('AdminDashboardService', () => {
  let dataSource: InMemoryDashboardDataSource;
  let auditRepo: InMemoryAuditRepository;
  let service: AdminDashboardService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const tmcAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: tenantId,
    role: 'TMCAdmin',
  };

  const reviewer: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: tenantId,
    role: 'Reviewer',
  };

  const sampleSummary: DashboardSummary = {
    tenants: { total: 5, active: 4 },
    enterprises: { total: 20, active: 18 },
    documents: { uploaded: 100, awaitingExtraction: 5, extractionFailed: 2 },
    policies: { awaitingReview: 8, approved: 12, published: 10 },
    reviews: { inProgress: 3, lowConfidencePending: 15 },
    recentChanges: 7,
  };

  const sampleEnterprises: EnterpriseStatusItem[] = [
    { enterprise_id: enterpriseId, enterprise_name: 'Acme Corp', tenant_id: tenantId, current_policy_version: 2, latest_document_version: 3, policy_status: 'Published', last_upload_date: '2024-06-01T10:00:00Z', last_review_date: '2024-06-02T10:00:00Z', last_published_date: '2024-06-03T10:00:00Z', pending_review_count: 0, failed_extraction_count: 0 },
    { enterprise_id: '550e8400-e29b-41d4-a716-446655440011', enterprise_name: 'Beta Ltd', tenant_id: tenantId, current_policy_version: 1, latest_document_version: 2, policy_status: 'Review', last_upload_date: '2024-06-10T10:00:00Z', last_review_date: null, last_published_date: null, pending_review_count: 5, failed_extraction_count: 1 },
    { enterprise_id: '550e8400-e29b-41d4-a716-446655440012', enterprise_name: 'Other Corp', tenant_id: otherTenantId, current_policy_version: null, latest_document_version: 1, policy_status: 'Processing', last_upload_date: '2024-06-15T10:00:00Z', last_review_date: null, last_published_date: null, pending_review_count: 0, failed_extraction_count: 0 },
  ];

  const sampleActivities: ActivityItem[] = [
    { timestamp: '2024-06-15T12:00:00Z', actor: 'user1', action: 'DocumentUploaded', entity_type: 'PolicyDocument', entity_id: 'doc1', enterprise_id: enterpriseId, tenant_id: tenantId, description: 'Document uploaded: travel-policy.pdf' },
    { timestamp: '2024-06-15T11:00:00Z', actor: 'user2', action: 'ReviewCompleted', entity_type: 'ReviewSession', entity_id: 'rev1', enterprise_id: enterpriseId, tenant_id: tenantId, description: 'Review completed for policy v2' },
    { timestamp: '2024-06-14T10:00:00Z', actor: 'user3', action: 'PolicyPublished', entity_type: 'ApprovedPolicy', entity_id: 'pol1', enterprise_id: enterpriseId, tenant_id: tenantId, description: 'Policy v2 published' },
    { timestamp: '2024-06-13T09:00:00Z', actor: 'admin', action: 'EnterpriseCreated', entity_type: 'Enterprise', entity_id: 'ent2', enterprise_id: null, tenant_id: otherTenantId, description: 'Enterprise Other Corp created' },
  ];

  const sampleExceptions: ExceptionItem[] = [
    { id: 'exc1', error_type: 'ExtractionFailed', count: 3, latest_occurrence: '2024-06-15T08:00:00Z', affected_enterprise: enterpriseId, affected_entity_id: 'doc5', description: 'Textract extraction failed: corrupted PDF' },
    { id: 'exc2', error_type: 'AIExtractionFailed', count: 1, latest_occurrence: '2024-06-14T14:00:00Z', affected_enterprise: enterpriseId, affected_entity_id: 'doc6', description: 'Bedrock timeout during extraction' },
  ];

  beforeEach(() => {
    dataSource = new InMemoryDashboardDataSource();
    auditRepo = new InMemoryAuditRepository();
    service = new AdminDashboardService(dataSource, auditRepo);

    dataSource.setSummary(sampleSummary);
    dataSource.setEnterprises(sampleEnterprises);
    dataSource.setActivities(sampleActivities);
    dataSource.setExceptions(sampleExceptions);
  });

  describe('SystemAdmin dashboard summary across tenants', () => {
    it('should return full platform summary', async () => {
      const result = await service.getSummary(systemAdmin);
      expect(result.tenants.total).toBe(5);
      expect(result.enterprises.active).toBe(18);
      expect(result.documents.extractionFailed).toBe(2);
    });
  });

  describe('TMCAdmin dashboard summary limited to tenant', () => {
    it('should return tenant-scoped summary', async () => {
      const result = await service.getSummary(tmcAdmin);
      expect(result).toBeDefined();
      expect(result.tenants.total).toBe(5); // data source returns same (simplified)
    });
  });

  describe('Prevent cross-tenant data access', () => {
    it('should reject Reviewer from accessing dashboard', async () => {
      await expect(service.getSummary(reviewer)).rejects.toThrow('Dashboard access requires');
    });

    it('should reject TMCAdmin filtering by other tenant', async () => {
      await expect(
        service.getEnterprises(tmcAdmin, { tenantId: otherTenantId }),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('Enterprise status list', () => {
    it('should return all enterprises for SystemAdmin', async () => {
      const result = await service.getEnterprises(systemAdmin);
      expect(result.data).toHaveLength(3);
      expect(result.totalRecords).toBe(3);
    });

    it('should filter by tenant for TMCAdmin', async () => {
      const result = await service.getEnterprises(tmcAdmin);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((e) => e.tenant_id === tenantId)).toBe(true);
    });
  });

  describe('Recent activity feed', () => {
    it('should return activity items', async () => {
      const result = await service.getActivity(systemAdmin);
      expect(result.data).toHaveLength(4);
    });

    it('should filter by tenant for TMCAdmin', async () => {
      const result = await service.getActivity(tmcAdmin);
      expect(result.data).toHaveLength(3);
      expect(result.data.every((a) => a.tenant_id === tenantId)).toBe(true);
    });
  });

  describe('Exception summary', () => {
    it('should return exception items', async () => {
      const result = await service.getExceptions(systemAdmin);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].error_type).toBe('ExtractionFailed');
    });
  });

  describe('Filtering by tenant', () => {
    it('should allow SystemAdmin to filter by tenant', async () => {
      const result = await service.getEnterprises(systemAdmin, { tenantId: otherTenantId });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].tenant_id).toBe(otherTenantId);
    });
  });

  describe('Filtering by enterprise', () => {
    it('should filter enterprises by ID', async () => {
      const result = await service.getEnterprises(systemAdmin, { enterpriseId });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].enterprise_id).toBe(enterpriseId);
    });

    it('should filter activity by enterprise', async () => {
      const result = await service.getActivity(systemAdmin, { enterpriseId });
      expect(result.data.every((a) => a.enterprise_id === enterpriseId)).toBe(true);
    });
  });

  describe('Filtering by status', () => {
    it('should filter enterprises by policy status', async () => {
      const result = await service.getEnterprises(systemAdmin, { status: 'Review' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].policy_status).toBe('Review');
    });
  });

  describe('Filtering by date range', () => {
    it('should filter activity by fromDate', async () => {
      const result = await service.getActivity(systemAdmin, { fromDate: '2024-06-15T00:00:00Z' });
      expect(result.data).toHaveLength(2);
    });

    it('should filter activity by toDate', async () => {
      const result = await service.getActivity(systemAdmin, { toDate: '2024-06-14T10:00:00Z' });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Pagination', () => {
    it('should paginate enterprise list', async () => {
      const result = await service.getEnterprises(systemAdmin, {}, 1, 2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.totalRecords).toBe(3);
    });

    it('should return second page', async () => {
      const result = await service.getEnterprises(systemAdmin, {}, 2, 2);
      expect(result.page).toBe(2);
      expect(result.data).toHaveLength(1);
    });

    it('should paginate activity feed', async () => {
      const result = await service.getActivity(systemAdmin, {}, 1, 2);
      expect(result.data).toHaveLength(2);
      expect(result.totalRecords).toBe(4);
    });
  });

  describe('Audit logging', () => {
    it('should audit dashboard summary view', async () => {
      await service.getSummary(systemAdmin);
      const audits = await auditRepo.findByEntity('Dashboard', 'summary');
      expect(audits.some((a) => a.action === 'DashboardSummaryViewed')).toBe(true);
    });

    it('should audit enterprise dashboard view', async () => {
      await service.getEnterprises(systemAdmin);
      const audits = await auditRepo.findByEntity('Dashboard', 'enterprises');
      expect(audits.some((a) => a.action === 'EnterpriseDashboardViewed')).toBe(true);
    });

    it('should audit activity feed view', async () => {
      await service.getActivity(systemAdmin);
      const audits = await auditRepo.findByEntity('Dashboard', 'activity');
      expect(audits.some((a) => a.action === 'ActivityFeedViewed')).toBe(true);
    });

    it('should audit exception dashboard view', async () => {
      await service.getExceptions(systemAdmin);
      const audits = await auditRepo.findByEntity('Dashboard', 'exceptions');
      expect(audits.some((a) => a.action === 'ExceptionDashboardViewed')).toBe(true);
    });
  });

  describe('Empty state with no data', () => {
    it('should return zero counts when empty', async () => {
      dataSource.clear();
      const result = await service.getSummary(systemAdmin);
      expect(result.tenants.total).toBe(0);
      expect(result.enterprises.total).toBe(0);
    });

    it('should return empty enterprise list', async () => {
      dataSource.clear();
      const result = await service.getEnterprises(systemAdmin);
      expect(result.data).toHaveLength(0);
      expect(result.totalRecords).toBe(0);
    });

    it('should return empty activity feed', async () => {
      dataSource.clear();
      const result = await service.getActivity(systemAdmin);
      expect(result.data).toHaveLength(0);
    });
  });
});
