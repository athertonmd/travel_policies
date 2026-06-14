import { EnterpriseEntity } from '../domain/types';

/**
 * Enterprise Repository Interface.
 * Implementations may be in-memory (for testing) or backed by Aurora PostgreSQL.
 */
export interface EnterpriseRepository {
  create(enterprise: EnterpriseEntity): Promise<EnterpriseEntity>;
  findById(enterpriseId: string): Promise<EnterpriseEntity | null>;
  findByTenant(tenantId: string): Promise<EnterpriseEntity[]>;
  update(enterprise: EnterpriseEntity): Promise<EnterpriseEntity>;
}
