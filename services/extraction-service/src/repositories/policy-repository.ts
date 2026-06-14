import { ExtractedPolicyEntity, PolicyRuleEntity } from '../domain/ai-types';

/**
 * Extracted Policy Repository Interface.
 */
export interface ExtractedPolicyRepository {
  create(policy: ExtractedPolicyEntity): Promise<ExtractedPolicyEntity>;
  findById(policyId: string): Promise<ExtractedPolicyEntity | null>;
  findByDocument(documentId: string): Promise<ExtractedPolicyEntity | null>;
}

/**
 * Policy Rule Repository Interface.
 */
export interface PolicyRuleRepository {
  createBatch(rules: PolicyRuleEntity[]): Promise<PolicyRuleEntity[]>;
  findByPolicy(policyId: string): Promise<PolicyRuleEntity[]>;
}
