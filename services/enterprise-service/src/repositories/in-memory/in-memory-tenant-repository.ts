import { TenantRepository } from '../tenant-repository';
import { TenantEntity } from '../../domain/types';
import { NotFoundError, ConflictError } from '../../domain/errors';

/**
 * In-memory implementation of TenantRepository for testing.
 */
export class InMemoryTenantRepository implements TenantRepository {
  private store = new Map<string, TenantEntity>();

  async create(tenant: TenantEntity): Promise<TenantEntity> {
    if (this.store.has(tenant.tenant_id)) {
      throw new ConflictError(`Tenant already exists: ${tenant.tenant_id}`);
    }
    this.store.set(tenant.tenant_id, { ...tenant });
    return { ...tenant };
  }

  async findById(tenantId: string): Promise<TenantEntity | null> {
    const tenant = this.store.get(tenantId);
    return tenant ? { ...tenant } : null;
  }

  async findAll(): Promise<TenantEntity[]> {
    return Array.from(this.store.values()).map((t) => ({ ...t }));
  }

  async update(tenant: TenantEntity): Promise<TenantEntity> {
    const existing = this.store.get(tenant.tenant_id);
    if (!existing) {
      throw new NotFoundError('Tenant', tenant.tenant_id);
    }
    if (existing.version !== tenant.version - 1) {
      throw new ConflictError('Optimistic concurrency conflict on tenant');
    }
    this.store.set(tenant.tenant_id, { ...tenant });
    return { ...tenant };
  }

  /** Test helper: clear all data */
  clear(): void {
    this.store.clear();
  }
}
