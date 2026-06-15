/**
 * Compliance Evaluation Engine domain types.
 * Project 14.
 */

export type EvaluationOutcome = 'Pass' | 'Warning' | 'Fail';

export interface BookingEvaluationRequest {
  air?: { cabinClass?: string; departureCountry?: string; arrivalCountry?: string; durationHours?: number; airline?: string; fareType?: string; bookingLeadDays?: number };
  hotel?: { city?: string; country?: string; hotelName?: string; hotelChain?: string; nightlyRate?: number; currency?: string; starRating?: number; nights?: number };
  rail?: { classOfService?: string; durationHours?: number; operator?: string };
  car?: { supplier?: string; vehicleCategory?: string; electricVehicle?: boolean };
  traveller?: { travellerGrade?: string; travellerRole?: string; executiveFlag?: boolean; projectFlag?: boolean };
}

export interface RuleEvaluationResult {
  ruleType: string;
  outcome: EvaluationOutcome;
  message: string;
  actualValue: unknown;
  requiredValue: unknown;
  policyVersion: string;
}

export interface ComplianceEvaluationResult {
  evaluation_id: string;
  enterprise_id: string;
  tenant_id: string;
  compliant: boolean;
  score: number;
  violations: RuleEvaluationResult[];
  warnings: RuleEvaluationResult[];
  evaluatedRules: RuleEvaluationResult[];
  policyVersion: string;
  evaluationTimestamp: string;
}

export interface PolicyRuleValue { rule_type: string; category: string; value: string }

export interface CallerContext { user_id: string; tenant_id: string; role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly' }
export interface AuditEntry { audit_id: string; tenant_id: string; user_id: string; entity_type: string; entity_id: string; action: string; timestamp: string }
