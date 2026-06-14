import { EnterpriseRepository } from '../enterprise-repository';
import { EnterpriseEntity } from '../../domain/types';
import { NotFoundError, ConflictError } from '../../domain/errors';

/**
 * In-memory implementation of EnterpriseRepository for testing.
 */
export class InMemoryEnterpriseRepository implements EnterpriseRepository {
  private store = new Map<string, EnterpriseEntity>();

  async create(enterprise: EnterpriseEntity): Promise<EnterpriseEntity> {
    if (this.store.has(enterprise.enterprise_id)) {
      throw new ConflictError(`Enterprise already exists: ${enterprise.enterprise_id}`);
    }
    this.store.set(enterprise.enterprise_id, { ...enterprise });
    return { ...enterprise };
  }

  async findById(enterpriseId: string): Promise<EnterpriseEntity | null> {
    const enterprise = this.store.get(enterpriseId);
    return enterprise ? { ...enterprise } : null;
  }

  async findByTenant(tenantId: string): Promise<EnterpriseEntity[]> {
    return Array.from(this.store.values())
      .filter((e) => e.tenant_id === tenantId)
      .map((e) => ({ ...e }));
  }

  async update(enterprise: EnterpriseEntity): Promise<EnterpriseEntity> {
    const existing = this.store.get(enterprise.enterprise_id);
    if (!existing) {
      throw new NotFoundError('Enterprise', enterprise.enterprise_id);
    }
    if (existing.version !== enterprise.version - 1) {
      throw new ConflictError('Optimistic concurrency conflict on enterprise');
    }
    this.store.set(enterprise.enterprise_id, { ...enterprise });
    return { ...enterprise };
  }

  /** Test helper: clear all data */
  clear(): void {
    this.store.clear();
  }
}
