import { RuleEvaluator } from './rule-evaluator';
import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export class AirRuleEvaluator implements RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    if (!booking.air) return results;
    const air = booking.air;
    const airRules = policyRules.filter((r) => r.category === 'Air');

    // AIR_007/008: Business class threshold
    const bcThreshold = airRules.find((r) => r.rule_type === 'AIR_008');
    if (bcThreshold && air.cabinClass?.toLowerCase() === 'business' && air.durationHours !== undefined) {
      const threshold = parseFloat(bcThreshold.value) || 8;
      if (air.durationHours < threshold) {
        results.push({ ruleType: 'AIR_008', outcome: 'Fail', message: `Business class requires flight duration greater than ${threshold} hours. Flight is ${air.durationHours} hours.`, actualValue: air.durationHours, requiredValue: threshold, policyVersion });
      } else {
        results.push({ ruleType: 'AIR_008', outcome: 'Pass', message: `Business class permitted: flight duration ${air.durationHours}h exceeds ${threshold}h threshold.`, actualValue: air.durationHours, requiredValue: threshold, policyVersion });
      }
    }

    // AIR_005/006: Premium economy threshold
    const peThreshold = airRules.find((r) => r.rule_type === 'AIR_006');
    if (peThreshold && air.cabinClass?.toLowerCase() === 'premium economy' && air.durationHours !== undefined) {
      const threshold = parseFloat(peThreshold.value) || 4;
      if (air.durationHours < threshold) {
        results.push({ ruleType: 'AIR_006', outcome: 'Warning', message: `Premium economy typically requires ${threshold}+ hours. Flight is ${air.durationHours} hours.`, actualValue: air.durationHours, requiredValue: threshold, policyVersion });
      } else {
        results.push({ ruleType: 'AIR_006', outcome: 'Pass', message: `Premium economy permitted for ${air.durationHours}h flight.`, actualValue: air.durationHours, requiredValue: threshold, policyVersion });
      }
    }

    // AIR_011: Preferred airlines
    const preferredAirlines = airRules.find((r) => r.rule_type === 'AIR_011');
    if (preferredAirlines && air.airline) {
      const preferred = preferredAirlines.value.split(',').map((s) => s.trim().toLowerCase());
      if (!preferred.includes(air.airline.toLowerCase())) {
        results.push({ ruleType: 'AIR_011', outcome: 'Warning', message: `${air.airline} is not a preferred airline. Preferred: ${preferredAirlines.value}`, actualValue: air.airline, requiredValue: preferredAirlines.value, policyVersion });
      } else {
        results.push({ ruleType: 'AIR_011', outcome: 'Pass', message: `${air.airline} is a preferred airline.`, actualValue: air.airline, requiredValue: preferredAirlines.value, policyVersion });
      }
    }

    // AIR_002: Advance purchase
    const advancePurchase = airRules.find((r) => r.rule_type === 'AIR_002');
    if (advancePurchase && air.bookingLeadDays !== undefined) {
      const required = parseInt(advancePurchase.value) || 14;
      if (air.bookingLeadDays < required) {
        results.push({ ruleType: 'AIR_002', outcome: 'Warning', message: `Booking made ${air.bookingLeadDays} days in advance. Policy recommends ${required}+ days.`, actualValue: air.bookingLeadDays, requiredValue: required, policyVersion });
      } else {
        results.push({ ruleType: 'AIR_002', outcome: 'Pass', message: `Advance purchase of ${air.bookingLeadDays} days meets ${required} day requirement.`, actualValue: air.bookingLeadDays, requiredValue: required, policyVersion });
      }
    }

    return results;
  }
}
