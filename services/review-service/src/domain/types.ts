/**
 * Review Service domain types.
 * Project 6: Human Review Workflow
 * Based on docs/steering/06-human-review-workflow.md
 */

/** Review session statuses */
export type ReviewSessionStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'Cancelled';

/** Rule review statuses */
export type RuleReviewStatus = 'PendingReview' | 'Approved' | 'Modified' | 'Rejected';

/** Review actions (BR-020) */
export type ReviewAction = 'Approve' | 'Modify' | 'Reject';

/** Low confidence threshold (BR-017) */
export const LOW_CONFIDENCE_THRESHOLD = 80;

/** Review session entity */
export interface ReviewSessionEntity {
  review_id: string;
  policy_id: string;
  tenant_id: string;
  enterprise_id: string;
  reviewer_id: string;
  status: ReviewSessionStatus;
  started_at: string;
  completed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Policy rule as seen by the review service */
export interface ReviewableRule {
  rule_id: string;
  policy_id: string;
  tenant_id: string;
  rule_type: string;
  category: string;
  value: string;
  confidence: number;
  source_reference: string;
  ai_generated_value: string;
  reviewed_value: string | null;
  review_status: RuleReviewStatus;
  version: number;
}

/** Rule correction record (ADR-009, BR-010) */
export interface RuleCorrectionEntity {
  correction_id: string;
  rule_id: string;
  tenant_id: string;
  ai_value: string;
  reviewer_value: string;
  reason: string;
  reviewer: string;
  correction_timestamp: string;
  created_at: string;
}

/** Review item for side-by-side display (ADR-012) */
export interface ReviewItem {
  rule_id: string;
  rule_type: string;
  category: string;
  confidence: number;
  review_status: RuleReviewStatus;
  source: {
    page_number: number | null;
    paragraph_reference: string | null;
    source_text: string | null;
  };
  extraction: {
    ai_generated_value: string;
    reviewed_value: string | null;
  };
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

/** Modify rule request */
export interface ModifyRuleRequest {
  reviewer_value: string;
  reason: string;
}

/** Reject rule request */
export interface RejectRuleRequest {
  reason: string;
}
