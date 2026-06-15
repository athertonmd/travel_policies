/**
 * Policy Change Intelligence domain types.
 * Project 13.
 */

export type ChangeSeverity = 'Minor' | 'Moderate' | 'Major';

export type ChangeCategory =
  | 'Air Policy'
  | 'Hotel Policy'
  | 'Rail Policy'
  | 'Car Policy'
  | 'Approval Policy'
  | 'Traveller Classification'
  | 'Supplier Preferences'
  | 'General Policy';

export interface PolicyChangeInput {
  rule_type: string;
  category: string;
  old_value: string | null;
  new_value: string | null;
  change_type: 'Added' | 'Removed' | 'Modified';
}

export interface ChangeSummary {
  summary_id: string;
  enterprise_id: string;
  tenant_id: string;
  comparison_id: string;
  policy_id: string;
  summary: string;
  key_changes: KeyChange[];
  potential_impacts: string[];
  risks: string[];
  recommendations: string[];
  generated_at: string;
  model_name: string;
}

export interface KeyChange {
  rule_type: string;
  category: ChangeCategory;
  description: string;
  severity: ChangeSeverity;
  old_value: string | null;
  new_value: string | null;
}

export interface CallerContext {
  user_id: string;
  tenant_id: string;
  role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';
}

export interface AuditEntry {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}
