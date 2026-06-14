import { EnterpriseLookup } from '../enterprise-lookup';
import { EnterpriseRef } from '../../domain/types';

/**
 * In-memory enterprise lookup for testing.
 */
export class InMemoryEnterpriseLookup implements EnterpriseLookup {
  private store = new Map<string, EnterpriseRef>();

  /** Register an enterprise for testing */
  addEnterprise(ref: EnterpriseRef): void {
    this.store.set(ref.enterprise_id, { ...ref });
  }

  async findById(enterpriseId: string): Promise<EnterpriseRef | null> {
    const ref = this.store.get(enterpriseId);
    return ref ? { ...ref } : null;
  }

  clear(): void {
    this.store.clear();
  }
}
