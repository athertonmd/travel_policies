import {
  DashboardSummary,
  EnterpriseStatusItem,
  ActivityItem,
  ExceptionItem,
  DashboardFilters,
  AuditEntry,
} from '../domain/types';

/**
 * Data source interface for aggregating dashboard data.
 * In production this reads from Aurora, audit logs, and event history.
 */
export interface DashboardDataSource {
  getSummary(tenantId: string | null): Promise<DashboardSummary>;
  getEnterpriseStatuses(tenantId: string | null, filters: DashboardFilters): Promise<EnterpriseStatusItem[]>;
  getActivity(tenantId: string | null, filters: DashboardFilters, limit: number, offset: number): Promise<{ items: ActivityItem[]; total: number }>;
  getExceptions(tenantId: string | null, filters: DashboardFilters, limit: number, offset: number): Promise<{ items: ExceptionItem[]; total: number }>;
}

export interface AuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}
