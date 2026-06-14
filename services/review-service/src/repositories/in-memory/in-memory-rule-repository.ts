import { RuleRepository } from '../rule-repository';
import { ReviewableRule } from '../../domain/types';

export class InMemoryRuleRepository implements RuleRepository {
  private store = new Map<string, ReviewableRule>();

  addRule(rule: ReviewableRule): void {
    this.store.set(rule.rule_id, { ...rule });
  }

  async findByPolicy(policyId: string): Promise<ReviewableRule[]> {
    return Array.from(this.store.values())
      .filter((r) => r.policy_id === policyId)
      .map((r) => ({ ...r }));
  }

  async findById(ruleId: string): Promise<ReviewableRule | null> {
    const r = this.store.get(ruleId);
    return r ? { ...r } : null;
  }

  async update(rule: ReviewableRule): Promise<ReviewableRule> {
    this.store.set(rule.rule_id, { ...rule });
    return { ...rule };
  }

  clear(): void { this.store.clear(); }
}
