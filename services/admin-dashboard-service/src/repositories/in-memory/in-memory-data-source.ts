import { DashboardDataSource } from '../dashboard-data-source';
import {
  DashboardSummary,
  EnterpriseStatusItem,
  ActivityItem,
  ExceptionItem,
  DashboardFilters,
} from '../../domain/types';

/**
 * In-memory data source for testing dashboard service.
 */
export class InMemoryDashboardDataSource implements DashboardDataSource {
  private summary: DashboardSummary = {
    tenants: { total: 0, active: 0 },
    enterprises: { total: 0, active: 0 },
    documents: { uploaded: 0, awaitingExtraction: 0, extractionFailed: 0 },
    policies: { awaitingReview: 0, approved: 0, published: 0 },
    reviews: { inProgress: 0, lowConfidencePending: 0 },
    recentChanges: 0,
  };

  private enterprises: EnterpriseStatusItem[] = [];
  private activities: ActivityItem[] = [];
  private exceptions: ExceptionItem[] = [];

  setSummary(summary: DashboardSummary): void { this.summary = { ...summary }; }
  setEnterprises(items: EnterpriseStatusItem[]): void { this.enterprises = items.map((i) => ({ ...i })); }
  setActivities(items: ActivityItem[]): void { this.activities = items.map((i) => ({ ...i })); }
  setExceptions(items: ExceptionItem[]): void { this.exceptions = items.map((i) => ({ ...i })); }

  async getSummary(tenantId: string | null): Promise<DashboardSummary> {
    if (tenantId) {
      // Filter summary by tenant — simplified for testing
      return { ...this.summary };
    }
    return { ...this.summary };
  }

  async getEnterpriseStatuses(tenantId: string | null, filters: DashboardFilters): Promise<EnterpriseStatusItem[]> {
    let result = [...this.enterprises];
    if (tenantId) result = result.filter((e) => e.tenant_id === tenantId);
    if (filters.enterpriseId) result = result.filter((e) => e.enterprise_id === filters.enterpriseId);
    if (filters.status) result = result.filter((e) => e.policy_status === filters.status);
    return result;
  }

  async getActivity(tenantId: string | null, filters: DashboardFilters, limit: number, offset: number): Promise<{ items: ActivityItem[]; total: number }> {
    let result = [...this.activities];
    if (tenantId) result = result.filter((a) => a.tenant_id === tenantId);
    if (filters.enterpriseId) result = result.filter((a) => a.enterprise_id === filters.enterpriseId);
    if (filters.fromDate) result = result.filter((a) => a.timestamp >= filters.fromDate!);
    if (filters.toDate) result = result.filter((a) => a.timestamp <= filters.toDate!);
    const total = result.length;
    return { items: result.slice(offset, offset + limit), total };
  }

  async getExceptions(tenantId: string | null, filters: DashboardFilters, limit: number, offset: number): Promise<{ items: ExceptionItem[]; total: number }> {
    let result = [...this.exceptions];
    if (tenantId && filters.enterpriseId) {
      result = result.filter((e) => e.affected_enterprise === filters.enterpriseId);
    }
    const total = result.length;
    return { items: result.slice(offset, offset + limit), total };
  }

  clear(): void {
    this.summary = { tenants: { total: 0, active: 0 }, enterprises: { total: 0, active: 0 }, documents: { uploaded: 0, awaitingExtraction: 0, extractionFailed: 0 }, policies: { awaitingReview: 0, approved: 0, published: 0 }, reviews: { inProgress: 0, lowConfidencePending: 0 }, recentChanges: 0 };
    this.enterprises = [];
    this.activities = [];
    this.exceptions = [];
  }
}
