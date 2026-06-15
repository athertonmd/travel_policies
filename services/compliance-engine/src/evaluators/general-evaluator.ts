import { RuleEvaluator } from './rule-evaluator';
import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export class GeneralRuleEvaluator implements RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const generalRules = policyRules.filter((r) => r.category === 'General');
    const traveller = booking.traveller;

    // GEN_001: Travel approval required
    const approvalReq = generalRules.find((r) => r.rule_type === 'GEN_001');
    if (approvalReq) {
      results.push({ ruleType: 'GEN_001', outcome: 'Pass', message: 'Travel approval policy noted. Approval workflows managed externally.', actualValue: 'acknowledged', requiredValue: approvalReq.value, policyVersion });
    }

    // GEN_003: Executive exception — executives bypass certain rules
    if (traveller?.executiveFlag) {
      results.push({ ruleType: 'GEN_003', outcome: 'Pass', message: 'Executive traveller: enhanced entitlements apply.', actualValue: true, requiredValue: 'executive', policyVersion });
    }

    // GEN_005: Traveller grade
    const gradeRule = generalRules.find((r) => r.rule_type === 'GEN_005');
    if (gradeRule && traveller?.travellerGrade) {
      results.push({ ruleType: 'GEN_005', outcome: 'Pass', message: `Traveller grade: ${traveller.travellerGrade}. Grade definitions apply.`, actualValue: traveller.travellerGrade, requiredValue: gradeRule.value, policyVersion });
    }

    return results;
  }
}
