import { RuleEvaluator } from './rule-evaluator';
import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export class RailRuleEvaluator implements RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    if (!booking.rail) return results;
    const rail = booking.rail;
    const railRules = policyRules.filter((r) => r.category === 'Rail');

    // RAIL_001/002/003: Class of service + duration threshold
    const firstClassThreshold = railRules.find((r) => r.rule_type === 'RAIL_003');
    if (firstClassThreshold && rail.classOfService?.toLowerCase() === 'first' && rail.durationHours !== undefined) {
      const threshold = parseFloat(firstClassThreshold.value) || 2;
      if (rail.durationHours < threshold) {
        results.push({ ruleType: 'RAIL_003', outcome: 'Fail', message: `First class requires ${threshold}+ hours. Journey is ${rail.durationHours} hours.`, actualValue: rail.durationHours, requiredValue: threshold, policyVersion });
      } else {
        results.push({ ruleType: 'RAIL_003', outcome: 'Pass', message: `First class permitted for ${rail.durationHours}h journey.`, actualValue: rail.durationHours, requiredValue: threshold, policyVersion });
      }
    }

    return results;
  }
}
