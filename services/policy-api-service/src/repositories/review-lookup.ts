import { ReviewSessionRef, ReviewedRule } from '../domain/types';

export interface ReviewLookup {
  findCompletedReviewByPolicy(policyId: string): Promise<ReviewSessionRef | null>;
  findRulesByPolicy(policyId: string): Promise<ReviewedRule[]>;
}
