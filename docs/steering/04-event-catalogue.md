# Event Catalogue

## Purpose

Defines all domain events used by TPIP.

All services communicate through events where practical.

---

# Enterprise Events

## EnterpriseCreated

Payload:

- enterprise_id
- tenant_id

## EnterpriseUpdated

Payload:

- enterprise_id

## EnterpriseArchived

Payload:

- enterprise_id

---

# Document Events

## PolicyDocumentUploaded

Payload:

- document_id
- enterprise_id
- version_number

## PolicyDocumentProcessingStarted

Payload:

- document_id

## PolicyDocumentTextExtracted

Payload:

- document_id
- page_count

## PolicyDocumentExtractionCompleted

Payload:

- document_id
- policy_id

## PolicyDocumentExtractionFailed

Payload:

- document_id
- error_message

---

# Review Events

## ReviewStarted

Payload:

- review_id
- policy_id

## RuleApproved

Payload:

- rule_id

## RuleModified

Payload:

- rule_id
- old_value
- new_value

## ReviewCompleted

Payload:

- review_id

---

# Publication Events

## PolicyApproved

Payload:

- policy_id

## PolicyPublished

Payload:

- policy_id
- version_number

---

# Comparison Events

## PolicyComparisonStarted

Payload:

- enterprise_id
- old_version
- new_version

## PolicyDifferenceDetected

Payload:

- change_id
- rule_type

## PolicyComparisonCompleted

Payload:

- comparison_id

---

# Knowledge Base Events

## PolicyIndexed

Payload:

- policy_id

## PolicyEmbeddingCreated

Payload:

- embedding_id

---

# Audit Events

## UserLoggedIn

## DocumentViewed

## PolicyViewed

## PolicyExported

## RuleChanged

All audit events must be retained permanently.

No event schema may be modified without versioning.