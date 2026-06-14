/**
 * Admin Dashboard domain types.
 * Project 10: Admin Dashboard APIs & Operational Reporting.
 */

/** Dashboard summary metrics */
export interface DashboardSummary {
  tenants: { total: number; active: number };
  enterprises: { total: number; active: number };
  documents: { uploaded: number; awaitingExtraction: number; extractionFailed: number };
  policies: { awaitingReview: number; approved: number; published: number };
  reviews: { inProgress: number; lowConfidencePending: number };
  recentChanges: number;
}

/** Enterprise policy status view */
export interface EnterpriseStatusItem {
  enterprise_id: string;
  enterprise_name: string;
  tenant_id: string;
  current_policy_version: number | null;
  latest_document_version: number | null;
  policy_status: string;
  last_upload_date: string | null;
  last_review_date: string | null;
  last_published_date: string | null;
  pending_review_count: number;
  failed_extraction_count: number;
}

/** Activity feed item */
export interface ActivityItem {
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  enterprise_id: string | null;
  tenant_id: string;
  description: string;
}

/** Exception/error item */
export interface ExceptionItem {
  id: string;
  error_type: string;
  count: number;
  latest_occurrence: string;
  affected_enterprise: string | null;
  affected_entity_id: string | null;
  description: string;
}

/** Query filters */
export interface DashboardFilters {
  tenantId?: string;
  enterpriseId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  data: T[];
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
