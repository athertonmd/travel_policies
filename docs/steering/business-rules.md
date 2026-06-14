# Business Rules Catalogue

## Purpose

Defines the mandatory business rules governing platform behaviour.

---

# Enterprise Rules

## BR-001

Every policy belongs to exactly one enterprise.

## BR-002

Every enterprise belongs to exactly one tenant.

## BR-003

Enterprise identifiers must be globally unique.

## BR-004

Tenant identifiers must be globally unique.

---

# Policy Rules

## BR-005

Uploading a policy creates a new policy version.

## BR-006

Policy versions are immutable.

Published versions cannot be edited.

## BR-007

The original uploaded document must always be retained.

## BR-008

The original extracted text must always be retained.

## BR-009

The original AI extraction must always be retained.

## BR-010

Reviewer modifications must never overwrite the original AI extraction.

## BR-011

Policies cannot be deleted.

Soft delete only.

## BR-012

Version numbers must increase sequentially.

Example:

v1
v2
v3
v4

Version numbers may never be reused.

---

# Extraction Rules

## BR-013

Every extracted rule must contain a confidence score.

## BR-014

Every extracted rule must contain a source reference.

## BR-015

Every extracted rule must contain a rule type.

## BR-016

Every extracted rule must belong to a category.

Categories:

- Air
- Hotel
- Rail
- Car
- General

## BR-017

Confidence below 80 shall be treated as low confidence.

## BR-018

Low confidence rules require reviewer assessment.

---

# Review Rules

## BR-019

Every policy must pass through review before publication.

## BR-020

Reviewers may:

- Approve
- Modify
- Reject

## BR-021

Reviewer modifications require a reason.

## BR-022

Rejected rules require a reason.

## BR-023

Review completion requires all low confidence rules to be assessed.

## BR-024

Review completion requires all changes to be saved.

---

# Change Detection Rules

## BR-025

Every new version shall be compared against the latest approved version.

## BR-026

Changes shall be classified as:

- Added
- Removed
- Modified

## BR-027

Change history shall be retained permanently.

---

# Publication Rules

## BR-028

Only approved policies may be published.

## BR-029

Published policies are read-only.

## BR-030

Policy publication generates a PolicyPublished event.

---

# API Rules

## BR-031

Only published policies may be returned through standard APIs.

## BR-032

Historical versions may be retrieved through version-specific endpoints.

## BR-033

All API requests must be tenant scoped.

## BR-034

API consumers may only access enterprises belonging to their tenant.

---

# Knowledge Base Rules

## BR-035

Knowledge Base searches must be enterprise scoped.

## BR-036

Reviewer corrections must be included in retrieval context.

## BR-037

Policy versions must remain searchable.

---

# Security Rules

## BR-038

All actions require authentication.

## BR-039

System administrators may access all tenants.

## BR-040

Tenant administrators may access only their tenant.

## BR-041

Reviewers may access only assigned tenant data.

## BR-042

Cross-tenant data access is prohibited.

---

# Audit Rules

## BR-043

All user actions must generate audit records.

## BR-044

Audit records are immutable.

## BR-045

Audit records must include:

- User
- Timestamp
- Entity
- Action

## BR-046

All timestamps shall be stored in UTC.

---

# Schema Rules

## BR-047

Policy JSON must conform to the approved schema.

## BR-048

Schema changes must be backwards compatible.

## BR-049

Breaking schema changes require a new API version.

## BR-050

All services must support traceability and auditability.