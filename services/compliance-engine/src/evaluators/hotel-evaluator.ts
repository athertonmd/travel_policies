import { RuleEvaluator } from './rule-evaluator';
import { BookingEvaluationRequest, RuleEvaluationResult, PolicyRuleValue } from '../domain/types';

export class HotelRuleEvaluator implements RuleEvaluator {
  evaluate(booking: BookingEvaluationRequest, policyRules: PolicyRuleValue[], policyVersion: string): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    if (!booking.hotel) return results;
    const hotel = booking.hotel;
    const hotelRules = policyRules.filter((r) => r.category === 'Hotel');

    // HOTEL_001: Max nightly rate
    const maxRate = hotelRules.find((r) => r.rule_type === 'HOTEL_001');
    if (maxRate && hotel.nightlyRate !== undefined) {
      const cap = parseFloat(maxRate.value.replace(/[^0-9.]/g, '')) || 200;
      if (hotel.nightlyRate > cap) {
        results.push({ ruleType: 'HOTEL_001', outcome: 'Fail', message: `Nightly rate ${hotel.nightlyRate} exceeds maximum ${cap}.`, actualValue: hotel.nightlyRate, requiredValue: cap, policyVersion });
      } else {
        results.push({ ruleType: 'HOTEL_001', outcome: 'Pass', message: `Nightly rate ${hotel.nightlyRate} within ${cap} cap.`, actualValue: hotel.nightlyRate, requiredValue: cap, policyVersion });
      }
    }

    // HOTEL_004: Preferred chains
    const preferredChains = hotelRules.find((r) => r.rule_type === 'HOTEL_004');
    if (preferredChains && hotel.hotelChain) {
      const preferred = preferredChains.value.split(',').map((s) => s.trim().toLowerCase());
      if (!preferred.includes(hotel.hotelChain.toLowerCase())) {
        results.push({ ruleType: 'HOTEL_004', outcome: 'Warning', message: `${hotel.hotelChain} is not a preferred chain. Preferred: ${preferredChains.value}`, actualValue: hotel.hotelChain, requiredValue: preferredChains.value, policyVersion });
      } else {
        results.push({ ruleType: 'HOTEL_004', outcome: 'Pass', message: `${hotel.hotelChain} is a preferred chain.`, actualValue: hotel.hotelChain, requiredValue: preferredChains.value, policyVersion });
      }
    }

    // HOTEL_013: Minimum star rating
    const minStar = hotelRules.find((r) => r.rule_type === 'HOTEL_013');
    if (minStar && hotel.starRating !== undefined) {
      const required = parseInt(minStar.value) || 3;
      if (hotel.starRating < required) {
        results.push({ ruleType: 'HOTEL_013', outcome: 'Warning', message: `Hotel star rating ${hotel.starRating} below minimum ${required}.`, actualValue: hotel.starRating, requiredValue: required, policyVersion });
      } else {
        results.push({ ruleType: 'HOTEL_013', outcome: 'Pass', message: `Hotel star rating ${hotel.starRating} meets minimum ${required}.`, actualValue: hotel.starRating, requiredValue: required, policyVersion });
      }
    }

    return results;
  }
}
