import { PolicyRuleValue } from '../../domain/types';
export interface PolicyLookup { getPublishedRules(enterpriseId: string): Promise<{ rules: PolicyRuleValue[]; version: string } | null>; }
export class InMemoryPolicyLookup implements PolicyLookup {
  private store = new Map<string, { rules: PolicyRuleValue[]; version: string }>();
  setPolicy(enterpriseId: string, rules: PolicyRuleValue[], version: string): void { this.store.set(enterpriseId, { rules, version }); }
  async getPublishedRules(enterpriseId: string): Promise<{ rules: PolicyRuleValue[]; version: string } | null> { return this.store.get(enterpriseId) ?? null; }
  clear(): void { this.store.clear(); }
}
