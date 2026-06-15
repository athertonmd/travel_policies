import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export interface RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[];
}
