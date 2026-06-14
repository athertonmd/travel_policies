import { v4 as uuidv4 } from 'uuid';
import { TenantEntity, CreateTenantRequest, UpdateTenantRequest, CallerContext, AuditEntry } from '../domain/types';
import { CreateTenantSchema, UpdateTenantSchema } from '../domain/validation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import { TenantRepository } from '../repositories/tenant-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';

/**
 * Tenant Service — manages TMC tenant lifecycle.
 * Enforces BR-004 (globally unique IDs), BR-043 (audit), ADR-020 (tenant isolation).
 */
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /** Ensure caller is SystemAdmin (BR-039) */
  private assertSystemAdmin(caller: CallerContext): void {
    if (caller.role !== 'SystemAdmin') {
      throw new ForbiddenError('Only SystemAdmin can manage tenants');
    }
  }

  async createTenant(request: CreateTenantRequest, caller: CallerContext): Promise<TenantEntity> {
    this.assertSystemAdmin(caller);

    const parsed = CreateTenantSchema.safeParse(request);
    if (!parsed.success) {
      throw new ValidationError('Invalid tenant data', parsed.error.issues);
    }

    const now = new Date().toISOString();
    const tenant: TenantEntity = {
      tenant_id: uuidv4(),
      name: parsed.data.name,
      status: 'Active',
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const created = await this.tenantRepo.create(tenant);

    await this.auditRepo.create(this.buildAudit(caller, 'Tenant', created.tenant_id, 'TenantCreated'));

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'TenantCreated',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: created.tenant_id,
      source: 'enterprise-service',
      payload: { tenant_id: created.tenant_id },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return created;
  }

  async getTenant(tenantId: string, caller: CallerContext): Promise<TenantEntity> {
    this.assertTenantAccess(caller, tenantId);

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }
    return tenant;
  }

  async listTenants(caller: CallerContext): Promise<TenantEntity[]> {
    this.assertSystemAdmin(caller);
    return this.tenantRepo.findAll();
  }

  async updateTenant(
    tenantId: string,
    request: UpdateTenantRequest,
    caller: CallerContext,
  ): Promise<TenantEntity> {
    this.assertSystemAdmin(caller);

    const parsed = UpdateTenantSchema.safeParse(request);
    if (!parsed.success) {
      throw new ValidationError('Invalid tenant update', parsed.error.issues);
    }

    const existing = await this.tenantRepo.findById(tenantId);
    if (!existing) {
      throw new NotFoundError('Tenant', tenantId);
    }

    const now = new Date().toISOString();
    const updated: TenantEntity = {
      ...existing,
      name: parsed.data.name ?? existing.name,
      status: parsed.data.status ?? existing.status,
      version: existing.version + 1,
      updated_at: now,
    };

    const result = await this.tenantRepo.update(updated);

    await this.auditRepo.create(this.buildAudit(caller, 'Tenant', tenantId, 'TenantUpdated'));

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'TenantUpdated',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'enterprise-service',
      payload: { tenant_id: tenantId },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return result;
  }

  async archiveTenant(tenantId: string, caller: CallerContext): Promise<TenantEntity> {
    this.assertSystemAdmin(caller);

    const existing = await this.tenantRepo.findById(tenantId);
    if (!existing) {
      throw new NotFoundError('Tenant', tenantId);
    }

    const now = new Date().toISOString();
    const archived: TenantEntity = {
      ...existing,
      status: 'Archived',
      version: existing.version + 1,
      updated_at: now,
    };

    const result = await this.tenantRepo.update(archived);

    await this.auditRepo.create(this.buildAudit(caller, 'Tenant', tenantId, 'TenantArchived'));

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'TenantArchived',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'enterprise-service',
      payload: { tenant_id: tenantId },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return result;
  }

  /** SystemAdmin can access all tenants; others only their own (BR-039, BR-040) */
  private assertTenantAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) {
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
