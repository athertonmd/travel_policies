import { EnterpriseRef } from '../domain/types';

/**
 * Enterprise lookup interface for cross-service reference.
 * In production, this calls the enterprise-service or reads from DB.
 */
export interface EnterpriseLookup {
  findById(enterpriseId: string): Promise<EnterpriseRef | null>;
}
