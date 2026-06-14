import { v4 as uuidv4 } from 'uuid';
import {
  EnterpriseEntity,
  CreateEnterpriseRequest,
  UpdateEnterpriseRequest,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { CreateEnterpriseSchema, UpdateEnterpriseSchema } from '../domain/validation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import { TenantRepository } from '../repositories/tenant-repository';
import { EnterpriseRepository } from '../repositories/enterprise-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';

/**
 * Enterprise Service — manages corporate customer lifecycle within a tenant.
 * Enforces BR-001 (policy→enterprise), BR-002 (enterprise→tenant),
 * BR-003 (globally unique enterprise IDs), BR-042 (cross-tenant prohibition).
 */
export class EnterpriseService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly enterpriseRepo: EnterpriseRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  async createEnterprise(
    tenantId: string,
    request: CreateEnterpriseRequest,
    caller: CallerContext,
  ): Promise<EnterpriseEntity> {
    this.assertTenantAccess(caller, tenantId);

    const parsed = CreateEnterpriseSchema.safeParse(request);
    if (!parsed.success) {
      throw new ValidationError('Invalid enterprise data', parsed.error.issues);
    }

    // Verify tenant exists
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }

    const now = new Date().toISOString();
    const enterprise: EnterpriseEntity = {
      enterprise_id: uuidv4(),
      tenant_id: tenantId,
      name: parsed.data.name,
      country: parsed.data.country,
      status: 'Active',
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const created = await this.enterpriseRepo.create(enterprise);

    await this.auditRepo.create(
      this.buildAudit(caller, 'Enterprise', created.enterprise_id, 'EnterpriseCreated'),
    );

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'EnterpriseCreated',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'enterprise-service',
      payload: { enterprise_id: created.enterprise_id, tenant_id: tenantId },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return created;
  }

  async getEnterprise(
    tenantId: string,
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<EnterpriseEntity> {
    this.assertTenantAccess(caller, tenantId);

    const enterprise = await this.enterpriseRepo.findById(enterpriseId);
    if (!enterprise) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }

    // Enforce tenant isolation (BR-042)
    if (enterprise.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant enterprise access denied');
    }

    return enterprise;
  }

  async listEnterprises(tenantId: string, caller: CallerContext): Promise<EnterpriseEntity[]> {
    this.assertTenantAccess(caller, tenantId);
    return this.enterpriseRepo.findByTenant(tenantId);
  }

  async updateEnterprise(
    tenantId: string,
    enterpriseId: string,
    request: UpdateEnterpriseRequest,
    caller: CallerContext,
  ): Promise<EnterpriseEntity> {
    this.assertTenantAccess(caller, tenantId);

    const parsed = UpdateEnterpriseSchema.safeParse(request);
    if (!parsed.success) {
      throw new ValidationError('Invalid enterprise update', parsed.error.issues);
    }

    const existing = await this.enterpriseRepo.findById(enterpriseId);
    if (!existing) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }

    if (existing.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant enterprise access denied');
    }

    const now = new Date().toISOString();
    const updated: EnterpriseEntity = {
      ...existing,
      name: parsed.data.name ?? existing.name,
      country: parsed.data.country ?? existing.country,
      status: parsed.data.status ?? existing.status,
      version: existing.version + 1,
      updated_at: now,
    };

    const result = await this.enterpriseRepo.update(updated);

    await this.auditRepo.create(
      this.buildAudit(caller, 'Enterprise', enterpriseId, 'EnterpriseUpdated'),
    );

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'EnterpriseUpdated',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'enterprise-service',
      payload: { enterprise_id: enterpriseId },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return result;
  }

  async archiveEnterprise(
    tenantId: string,
    enterpriseId: string,
    caller: CallerContext,
  ): Promise<EnterpriseEntity> {
    this.assertTenantAccess(caller, tenantId);

    const existing = await this.enterpriseRepo.findById(enterpriseId);
    if (!existing) {
      throw new NotFoundError('Enterprise', enterpriseId);
    }

    if (existing.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant enterprise access denied');
    }

    const now = new Date().toISOString();
    const archived: EnterpriseEntity = {
      ...existing,
      status: 'Archived',
      version: existing.version + 1,
      updated_at: now,
    };

    const result = await this.enterpriseRepo.update(archived);

    await this.auditRepo.create(
      this.buildAudit(caller, 'Enterprise', enterpriseId, 'EnterpriseArchived'),
    );

    await this.eventBus.publish({
      event_id: uuidv4(),
      event_type: 'EnterpriseArchived',
      event_version: '1.0',
      timestamp: now,
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'enterprise-service',
      payload: { enterprise_id: enterpriseId },
    } as unknown as import('@tpip/event-contracts').BaseEvent);

    return result;
  }

  /**
   * Enforce tenant access rules:
   * - SystemAdmin can access all tenants (BR-039)
   * - Others can only access their own tenant (BR-040, BR-042)
   */
  private assertTenantAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private buildAudit(
    caller: CallerContext,
    entityType: string,
    entityId: string,
    action: string,
  ): AuditEntry {
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
