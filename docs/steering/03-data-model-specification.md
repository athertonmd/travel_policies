# Data Model Specification

## Tenant

Represents a Travel Management Company.

Fields:

- tenant_id
- name
- status
- created_at
- updated_at

---

## Enterprise

Represents a corporate customer.

Fields:

- enterprise_id
- tenant_id
- name
- country
- status
- created_at
- updated_at

Relationship:

Tenant 1:N Enterprise

---

## User

Fields:

- user_id
- tenant_id
- role
- email
- status

Roles:

- SystemAdmin
- TMCAdmin
- Reviewer
- ReadOnly

---

## PolicyDocument

Fields:

- document_id
- enterprise_id
- version_number
- filename
- upload_date
- uploaded_by
- status

Statuses:

- Uploaded
- Processing
- Review
- Approved
- Rejected

---

## ExtractedPolicy

Fields:

- policy_id
- enterprise_id
- version_number
- extraction_model
- extraction_timestamp
- overall_confidence

---

## PolicyRule

Fields:

- rule_id
- policy_id
- rule_type
- category
- value
- confidence
- source_reference

Categories:

- Air
- Hotel
- Rail
- Car

---

## RuleCorrection

Fields:

- correction_id
- rule_id
- ai_value
- reviewer_value
- reason
- reviewer
- correction_timestamp

---

## ReviewSession

Fields:

- review_id
- policy_id
- reviewer
- started_at
- completed_at

---

## PolicyComparison

Fields:

- comparison_id
- enterprise_id
- old_version
- new_version

---

## PolicyChange

Fields:

- change_id
- comparison_id
- rule_type
- old_value
- new_value
- change_type

Types:

- Added
- Removed
- Modified

---

## KnowledgeBaseDocument

Fields:

- kb_document_id
- enterprise_id
- version_number
- embedding_reference

---

## AuditLog

Fields:

- audit_id
- user_id
- entity_type
- entity_id
- action
- timestamp

---

## Standards

All entities must contain:

- created_at
- updated_at
- version

All entities must support optimistic concurrency control.

All entities must be tenant aware.