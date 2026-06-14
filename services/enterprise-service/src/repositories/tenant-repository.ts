import { TenantEntity } from '../domain/types';

/**
 * Tenant Repository Interface.
 * Implementations may be in-memory (for testing) or backed by Aurora PostgreSQL.
 */
export interface TenantRepository {
  create(tenant: TenantEntity): Promise<TenantEntity>;
  findById(tenantId: string): Promise<TenantEntity | null>;
  findAll(): Promise<TenantEntity[]>;
  update(tenant: TenantEntity): Promise<TenantEntity>;
}
