import { ReviewableRule } from '../domain/types';

export interface RuleRepository {
  findByPolicy(policyId: string): Promise<ReviewableRule[]>;
  findById(ruleId: string): Promise<ReviewableRule | null>;
  update(rule: ReviewableRule): Promise<ReviewableRule>;
}
