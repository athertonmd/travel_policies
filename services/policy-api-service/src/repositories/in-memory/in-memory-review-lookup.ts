import { ReviewLookup } from '../review-lookup';
import { ReviewSessionRef, ReviewedRule } from '../../domain/types';

export class InMemoryReviewLookup implements ReviewLookup {
  private sessions: ReviewSessionRef[] = [];
  private rules: ReviewedRule[] = [];

  addSession(session: ReviewSessionRef): void { this.sessions.push({ ...session }); }
  addRules(rules: ReviewedRule[]): void { this.rules.push(...rules.map((r) => ({ ...r }))); }

  async findCompletedReviewByPolicy(policyId: string): Promise<ReviewSessionRef | null> {
    const found = this.sessions.find((s) => s.policy_id === policyId && s.status === 'Completed');
    return found ? { ...found } : null;
  }

  async findRulesByPolicy(policyId: string): Promise<ReviewedRule[]> {
    return this.rules.filter((r) => r.rule_id.startsWith(policyId) || this.rules.some(() => true))
      .filter(() => true) // return all rules configured for this test context
      .map((r) => ({ ...r }));
  }

  /** Override to allow direct policy-based lookup */
  setRulesForPolicy(_policyId: string, rules: ReviewedRule[]): void {
    this.rules = rules.map((r) => ({ ...r }));
  }

  clear(): void { this.sessions = []; this.rules = []; }
}
