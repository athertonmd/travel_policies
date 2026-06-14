/**
 * Policy Publication & Version Comparison domain types.
 * Project 7.
 */

/** Published policy statuses */
export type PolicyPublicationStatus = 'Draft' | 'Review' | 'Approved' | 'Published' | 'Superseded' | 'Rejected';

/** Change types for version comparison (BR-026) */
export type ChangeType = 'Added' | 'Removed' | 'Modified';

/** Approved policy entity */
export interface ApprovedPolicyEntity {
  policy_id: string;
  enterprise_id: string;
  tenant_id: string;
  version_number: number;
  approved_policy_json: string;
  approved_at: string;
  approved_by: string;
  published_at: string | null;
  published_by: string | null;
  status: PolicyPublicationStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Policy comparison entity */
export interface PolicyComparisonEntity {
  comparison_id: string;
  enterprise_id: string;
  tenant_id: string;
  old_version: number | null;
  new_version: number;
  created_at: string;
}

/** Policy change entity */
export interface PolicyChangeEntity {
  change_id: string;
  comparison_id: string;
  tenant_id: string;
  rule_type: string;
  category: string;
  old_value: string | null;
  new_value: string | null;
  change_type: ChangeType;
  created_at: string;
}

/** Rule snapshot for comparison */
export interface RuleSnapshot {
  rule_type: string;
  category: string;
  value: string;
  review_status: string;
}

/** Comparison result */
export interface ComparisonResult {
  comparison_id: string;
  old_version: number | null;
  new_version: number;
  added: PolicyChangeEntity[];
  removed: PolicyChangeEntity[];
  modified: PolicyChangeEntity[];
}

/** Caller context */
export interface CallerContext {
  user_id: string;
  tenant_id: string;
  role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';
}

/** Audit entry */
export interface AuditEntry {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}

/** Review session reference */
export interface ReviewSessionRef {
  review_id: string;
  policy_id: string;
  tenant_id: string;
  status: string;
}

/** Reviewed rule for JSON generation */
export interface ReviewedRule {
  rule_id: string;
  rule_type: string;
  category: string;
  ai_generated_value: string;
  reviewed_value: string | null;
  review_status: string;
  confidence: number;
}
