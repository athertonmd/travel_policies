/**
 * Core domain entity interfaces.
 * Derived from docs/steering/03-data-model-specification.md
 */

import { TenantAwareVersionedEntity, TenantAwareEntity, BaseEntity } from './base';
import {
  EntityStatus,
  UserRole,
  PolicyDocumentStatus,
  PolicyCategory,
  ChangeType,
} from './enums';

/** Represents a Travel Management Company (Data Model: Tenant) */
export interface Tenant extends BaseEntity {
  tenant_id: string;
  name: string;
  status: EntityStatus;
  version: number;
}

/** Represents a corporate customer (Data Model: Enterprise) */
export interface Enterprise extends TenantAwareVersionedEntity {
  enterprise_id: string;
  name: string;
  country: string;
  status: EntityStatus;
}

/** Platform user (Data Model: User) */
export interface User extends TenantAwareEntity {
  user_id: string;
  role: UserRole;
  email: string;
  status: EntityStatus;
  version: number;
}

/** Uploaded policy document (Data Model: PolicyDocument) */
export interface PolicyDocument extends TenantAwareVersionedEntity {
  document_id: string;
  enterprise_id: string;
  version_number: number;
  filename: string;
  upload_date: string;
  uploaded_by: string;
  status: PolicyDocumentStatus;
}

/** AI-extracted policy (Data Model: ExtractedPolicy) */
export interface ExtractedPolicy extends TenantAwareVersionedEntity {
  policy_id: string;
  enterprise_id: string;
  version_number: number;
  extraction_model: string;
  extraction_timestamp: string;
  overall_confidence: number;
}

/** Individual extracted rule (Data Model: PolicyRule) */
export interface PolicyRule extends TenantAwareVersionedEntity {
  rule_id: string;
  policy_id: string;
  rule_type: string;
  category: PolicyCategory;
  value: string;
  confidence: number;
  source_reference: string;
}

/** Reviewer correction to a rule (Data Model: RuleCorrection) */
export interface RuleCorrection extends TenantAwareVersionedEntity {
  correction_id: string;
  rule_id: string;
  ai_value: string;
  reviewer_value: string;
  reason: string;
  reviewer: string;
  correction_timestamp: string;
}

/** Review session (Data Model: ReviewSession) */
export interface ReviewSession extends TenantAwareVersionedEntity {
  review_id: string;
  policy_id: string;
  reviewer: string;
  started_at: string;
  completed_at: string | null;
}

/** Policy version comparison (Data Model: PolicyComparison) */
export interface PolicyComparison extends TenantAwareVersionedEntity {
  comparison_id: string;
  enterprise_id: string;
  old_version: number;
  new_version: number;
}

/** Individual policy change (Data Model: PolicyChange) */
export interface PolicyChange extends TenantAwareVersionedEntity {
  change_id: string;
  comparison_id: string;
  rule_type: string;
  old_value: string | null;
  new_value: string | null;
  change_type: ChangeType;
}

/** Knowledge base document (Data Model: KnowledgeBaseDocument) */
export interface KnowledgeBaseDocument extends TenantAwareVersionedEntity {
  kb_document_id: string;
  enterprise_id: string;
  version_number: number;
  embedding_reference: string;
}

/** Audit log entry (Data Model: AuditLog, BR-043) */
export interface AuditLog extends BaseEntity {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}
