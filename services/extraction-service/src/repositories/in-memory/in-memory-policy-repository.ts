import { ExtractedPolicyRepository, PolicyRuleRepository } from '../policy-repository';
import { ExtractedPolicyEntity, PolicyRuleEntity } from '../../domain/ai-types';

/**
 * In-memory ExtractedPolicy repository for testing.
 */
export class InMemoryExtractedPolicyRepository implements ExtractedPolicyRepository {
  private store = new Map<string, ExtractedPolicyEntity>();

  async create(policy: ExtractedPolicyEntity): Promise<ExtractedPolicyEntity> {
    this.store.set(policy.policy_id, { ...policy });
    return { ...policy };
  }

  async findById(policyId: string): Promise<ExtractedPolicyEntity | null> {
    const p = this.store.get(policyId);
    return p ? { ...p } : null;
  }

  async findByDocument(documentId: string): Promise<ExtractedPolicyEntity | null> {
    const found = Array.from(this.store.values()).find((p) => p.document_id === documentId);
    return found ? { ...found } : null;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * In-memory PolicyRule repository for testing.
 */
export class InMemoryPolicyRuleRepository implements PolicyRuleRepository {
  private store: PolicyRuleEntity[] = [];

  async createBatch(rules: PolicyRuleEntity[]): Promise<PolicyRuleEntity[]> {
    const copies = rules.map((r) => ({ ...r }));
    this.store.push(...copies);
    return copies;
  }

  async findByPolicy(policyId: string): Promise<PolicyRuleEntity[]> {
    return this.store.filter((r) => r.policy_id === policyId).map((r) => ({ ...r }));
  }

  clear(): void {
    this.store = [];
  }
}
