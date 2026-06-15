import { RuleEvaluator } from './rule-evaluator';
import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export class CarRuleEvaluator implements RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    if (!booking.car) return results;
    const car = booking.car;
    const carRules = policyRules.filter((r) => r.category === 'Car');

    // CAR_001: Allowed vehicle category
    const allowedCategory = carRules.find((r) => r.rule_type === 'CAR_001');
    if (allowedCategory && car.vehicleCategory) {
      const allowed = allowedCategory.value.split(',').map((s) => s.trim().toLowerCase());
      if (!allowed.includes(car.vehicleCategory.toLowerCase())) {
        results.push({ ruleType: 'CAR_001', outcome: 'Fail', message: `Vehicle category ${car.vehicleCategory} not allowed. Allowed: ${allowedCategory.value}`, actualValue: car.vehicleCategory, requiredValue: allowedCategory.value, policyVersion });
      } else {
        results.push({ ruleType: 'CAR_001', outcome: 'Pass', message: `Vehicle category ${car.vehicleCategory} is allowed.`, actualValue: car.vehicleCategory, requiredValue: allowedCategory.value, policyVersion });
      }
    }

    // CAR_002: Preferred suppliers
    const preferredSupplier = carRules.find((r) => r.rule_type === 'CAR_002');
    if (preferredSupplier && car.supplier) {
      const preferred = preferredSupplier.value.split(',').map((s) => s.trim().toLowerCase());
      if (!preferred.includes(car.supplier.toLowerCase())) {
        results.push({ ruleType: 'CAR_002', outcome: 'Warning', message: `${car.supplier} is not a preferred supplier.`, actualValue: car.supplier, requiredValue: preferredSupplier.value, policyVersion });
      } else {
        results.push({ ruleType: 'CAR_002', outcome: 'Pass', message: `${car.supplier} is a preferred supplier.`, actualValue: car.supplier, requiredValue: preferredSupplier.value, policyVersion });
      }
    }

    // CAR_005: EV preference
    const evPref = carRules.find((r) => r.rule_type === 'CAR_005');
    if (evPref && car.electricVehicle === false) {
      results.push({ ruleType: 'CAR_005', outcome: 'Warning', message: 'Electric vehicle preferred but non-EV selected.', actualValue: false, requiredValue: true, policyVersion });
    }

    return results;
  }
}
