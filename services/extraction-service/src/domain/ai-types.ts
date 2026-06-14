/**
 * AI Policy Extraction domain types.
 * Project 5: Based on docs/steering/05-ai-extraction-specification.md
 */

/** Policy categories */
export type PolicyCategory = 'Air' | 'Hotel' | 'Rail' | 'Car' | 'General';

/** Confidence bands (05-ai-extraction-specification) */
export type ConfidenceBand = 'High' | 'Medium' | 'Low';

/** Review status for extracted rules */
export type ReviewStatus = 'PendingReview' | 'Approved' | 'Modified' | 'Rejected';

/** Rule taxonomy codes */
export const RULE_TAXONOMY: Record<PolicyCategory, string[]> = {
  Air: [
    'AIR_001', 'AIR_002', 'AIR_003', 'AIR_004', 'AIR_005',
    'AIR_006', 'AIR_007', 'AIR_008', 'AIR_009', 'AIR_010',
    'AIR_011', 'AIR_012', 'AIR_013', 'AIR_014', 'AIR_015',
  ],
  Hotel: [
    'HOTEL_001', 'HOTEL_002', 'HOTEL_003', 'HOTEL_004', 'HOTEL_005',
    'HOTEL_006', 'HOTEL_007', 'HOTEL_008', 'HOTEL_009', 'HOTEL_010',
    'HOTEL_011', 'HOTEL_012', 'HOTEL_013',
  ],
  Rail: [
    'RAIL_001', 'RAIL_002', 'RAIL_003', 'RAIL_004', 'RAIL_005', 'RAIL_006',
  ],
  Car: [
    'CAR_001', 'CAR_002', 'CAR_003', 'CAR_004', 'CAR_005', 'CAR_006',
  ],
  General: [
    'GEN_001', 'GEN_002', 'GEN_003', 'GEN_004', 'GEN_005',
    'GEN_006', 'GEN_007', 'GEN_008', 'GEN_009', 'GEN_010',
  ],
};

/** All valid rule type codes */
export const ALL_RULE_CODES: string[] = Object.values(RULE_TAXONOMY).flat();

/** Source reference for an extracted rule */
export interface SourceReference {
  document_id: string;
  page_number: number;
  paragraph_reference: string | null;
  source_text: string;
  character_start: number | null;
  character_end: number | null;
}

/** Single extracted rule from AI */
export interface ExtractedRuleOutput {
  rule_type: string;
  category: PolicyCategory;
  value: string;
  confidence: number;
  source_reference: SourceReference;
}

/** Structured policy JSON output from AI (05-ai-extraction-specification) */
export interface StructuredPolicyOutput {
  enterpriseId: string;
  policyVersion: string;
  effectiveDate: string | null;
  air: Record<string, unknown>;
  hotel: Record<string, unknown>;
  rail: Record<string, unknown>;
  car: Record<string, unknown>;
  general: Record<string, unknown>;
}

/** AI extraction provider input */
export interface PolicyExtractionInput {
  document_id: string;
  enterprise_id: string;
  policy_version: number;
  extracted_pages: { page_number: number; page_text: string }[];
  correction_context?: Record<string, unknown>;
}

/** AI extraction provider output */
export interface PolicyExtractionOutput {
  structured_policy_json: StructuredPolicyOutput;
  extracted_rules: ExtractedRuleOutput[];
  overall_confidence: number;
  model_name: string;
  extraction_timestamp: string;
}

/** ExtractedPolicy entity (DB record) */
export interface ExtractedPolicyEntity {
  policy_id: string;
  document_id: string;
  tenant_id: string;
  enterprise_id: string;
  version_number: number;
  extraction_model: string;
  extraction_timestamp: string;
  overall_confidence: number;
  raw_ai_output: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** PolicyRule entity (DB record) */
export interface PolicyRuleEntity {
  rule_id: string;
  policy_id: string;
  tenant_id: string;
  rule_type: string;
  category: PolicyCategory;
  value: string;
  confidence: number;
  source_reference: string; // JSON stringified SourceReference
  ai_generated_value: string;
  reviewed_value: string | null;
  review_status: ReviewStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Get confidence band (BR-017) */
export function getConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 95) return 'High';
  if (confidence >= 80) return 'Medium';
  return 'Low';
}

/** Check if a rule type is valid per taxonomy */
export function isValidRuleType(ruleType: string): boolean {
  return ALL_RULE_CODES.includes(ruleType);
}

/** Get category for a rule type */
export function getCategoryForRuleType(ruleType: string): PolicyCategory | null {
  for (const [category, codes] of Object.entries(RULE_TAXONOMY)) {
    if (codes.includes(ruleType)) return category as PolicyCategory;
  }
  return null;
}
