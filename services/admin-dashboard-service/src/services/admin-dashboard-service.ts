import { v4 as uuidv4 } from 'uuid';
import {
  DashboardSummary,
  EnterpriseStatusItem,
  ActivityItem,
  ExceptionItem,
  DashboardFilters,
  PaginatedResponse,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { ForbiddenError } from '../domain/errors';
import { DashboardDataSource, AuditRepository } from '../repositories/dashboard-data-source';

/**
 * Admin Dashboard Service.
 *
 * Enforces:
 * - BR-039: SystemAdmin may access all tenants
 * - BR-040: TMCAdmin may access only their tenant
 * - BR-042: Cross-tenant access prohibited
 * - BR-043: Audit all actions
 */
export class AdminDashboardService {
  constructor(
    private readonly dataSource: DashboardDataSource,
    private readonly auditRepo: AuditRepository,
  ) {}

  /**
   * Get platform-wide or tenant-scoped summary.
   */
  async getSummary(caller: CallerContext): Promise<DashboardSummary> {
    this.assertDashboardAccess(caller);

    const tenantScope = caller.role === 'SystemAdmin' ? null : caller.tenant_id;
    const summary = await this.dataSource.getSummary(tenantScope);

    await this.auditRepo.create(this.buildAudit(caller, 'Dashboard', 'summary', 'DashboardSummaryViewed'));

    return summary;
  }

  /**
   * Get enterprise status list with pagination.
   */
  async getEnterprises(
    caller: CallerContext,
    filters: DashboardFilters = {},
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResponse<EnterpriseStatusItem>> {
    this.assertDashboardAccess(caller);
    this.assertFilterAccess(caller, filters);

    const tenantScope = caller.role === 'SystemAdmin' ? filters.tenantId ?? null : caller.tenant_id;
    const items = await this.dataSource.getEnterpriseStatuses(tenantScope, filters);

    const offset = (page - 1) * pageSize;
    const paged = items.slice(offset, offset + pageSize);

    await this.auditRepo.create(this.buildAudit(caller, 'Dashboard', 'enterprises', 'EnterpriseDashboardViewed'));

    return { page, pageSize, totalRecords: items.length, data: paged };
  }

  /**
   * Get activity feed with pagination.
   */
  async getActivity(
    caller: CallerContext,
    filters: DashboardFilters = {},
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResponse<ActivityItem>> {
    this.assertDashboardAccess(caller);
    this.assertFilterAccess(caller, filters);

    const tenantScope = caller.role === 'SystemAdmin' ? filters.tenantId ?? null : caller.tenant_id;
    const offset = (page - 1) * pageSize;
    const { items, total } = await this.dataSource.getActivity(tenantScope, filters, pageSize, offset);

    await this.auditRepo.create(this.buildAudit(caller, 'Dashboard', 'activity', 'ActivityFeedViewed'));

    return { page, pageSize, totalRecords: total, data: items };
  }

  /**
   * Get exception/error summary with pagination.
   */
  async getExceptions(
    caller: CallerContext,
    filters: DashboardFilters = {},
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResponse<ExceptionItem>> {
    this.assertDashboardAccess(caller);
    this.assertFilterAccess(caller, filters);

    const tenantScope = caller.role === 'SystemAdmin' ? filters.tenantId ?? null : caller.tenant_id;
    const offset = (page - 1) * pageSize;
    const { items, total } = await this.dataSource.getExceptions(tenantScope, filters, pageSize, offset);

    await this.auditRepo.create(this.buildAudit(caller, 'Dashboard', 'exceptions', 'ExceptionDashboardViewed'));

    return { page, pageSize, totalRecords: total, data: items };
  }

  /**
   * Only SystemAdmin and TMCAdmin may access the dashboard.
   */
  private assertDashboardAccess(caller: CallerContext): void {
    if (caller.role === 'SystemAdmin' || caller.role === 'TMCAdmin') return;
    throw new ForbiddenError('Dashboard access requires SystemAdmin or TMCAdmin role');
  }

  /**
   * TMCAdmin cannot filter by other tenants.
   */
  private assertFilterAccess(caller: CallerContext, filters: DashboardFilters): void {
    if (caller.role === 'SystemAdmin') return;
    if (filters.tenantId && filters.tenantId !== caller.tenant_id) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private buildAudit(caller: CallerContext, entityType: string, entityId: string, action: string): AuditEntry {
    return {
      audit_id: uuidv4(),
      tenant_id: caller.tenant_id,
      user_id: caller.user_id,
      entity_type: entityType,
      entity_id: entityId,
      action,
      timestamp: new Date().toISOString(),
    };
  }
}
