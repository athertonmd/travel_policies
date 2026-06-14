import { ApprovedPolicyRepository } from '../approved-policy-repository';
import { ApprovedPolicyEntity } from '../../domain/types';

export class InMemoryApprovedPolicyRepository implements ApprovedPolicyRepository {
  private store = new Map<string, ApprovedPolicyEntity>();

  async create(policy: ApprovedPolicyEntity): Promise<ApprovedPolicyEntity> {
    this.store.set(policy.policy_id, { ...policy });
    return { ...policy };
  }

  async findById(policyId: string): Promise<ApprovedPolicyEntity | null> {
    const p = this.store.get(policyId);
    return p ? { ...p } : null;
  }

  async findCurrentByEnterprise(enterpriseId: string): Promise<ApprovedPolicyEntity | null> {
    const found = Array.from(this.store.values()).find(
      (p) => p.enterprise_id === enterpriseId && p.status === 'Published',
    );
    return found ? { ...found } : null;
  }

  async findByEnterpriseAndVersion(enterpriseId: string, version: number): Promise<ApprovedPolicyEntity | null> {
    const found = Array.from(this.store.values()).find(
      (p) => p.enterprise_id === enterpriseId && p.version_number === version,
    );
    return found ? { ...found } : null;
  }

  async update(policy: ApprovedPolicyEntity): Promise<ApprovedPolicyEntity> {
    this.store.set(policy.policy_id, { ...policy });
    return { ...policy };
  }

  clear(): void { this.store.clear(); }
}
