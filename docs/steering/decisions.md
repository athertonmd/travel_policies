# Architecture Decision Log

## Purpose

Captures approved architectural and product decisions.

This document is the authoritative source for design decisions.

---

# ADR-001

Decision:

Use AWS Native architecture.

Reason:

Alignment with existing organisational expertise and infrastructure.

Status:

Approved

Date:

2026-06-13

---

# ADR-002

Decision:

Use Aurora PostgreSQL as the system of record.

Reason:

Strong relational modelling and versioning support.

Status:

Approved

Date:

2026-06-13

---

# ADR-003

Decision:

Use Amazon S3 for document storage.

Reason:

Scalable, durable and cost-effective.

Status:

Approved

Date:

2026-06-13

---

# ADR-004

Decision:

Use Amazon Textract for OCR.

Reason:

AWS-native integration and strong document extraction capability.

Status:

Approved

Date:

2026-06-13

---

# ADR-005

Decision:

Use Amazon Bedrock Claude Sonnet as the extraction model.

Reason:

High extraction quality and enterprise-grade integration.

Status:

Approved

Date:

2026-06-13

---

# ADR-006

Decision:

Use Human-in-the-Loop validation.

Reason:

Travel policies contain ambiguity, exceptions and contextual rules.

Status:

Approved

Date:

2026-06-13

---

# ADR-007

Decision:

Support multiple enterprises per tenant.

Reason:

Primary customer profile is a Travel Management Company.

Status:

Approved

Date:

2026-06-13

---

# ADR-008

Decision:

Policy versions are immutable.

Reason:

Supports auditability and historical analysis.

Status:

Approved

Date:

2026-06-13

---

# ADR-009

Decision:

Store reviewer corrections permanently.

Reason:

Improves future extraction quality and transparency.

Status:

Approved

Date:

2026-06-13

---

# ADR-010

Decision:

Use OpenSearch for vector retrieval.

Reason:

AWS-native semantic search capability.

Status:

Approved

Date:

2026-06-13

---

# ADR-011

Decision:

Platform acts as a policy repository only.

Reason:

Compliance evaluation is intentionally out of scope for MVP.

Status:

Approved

Date:

2026-06-13

---

# ADR-012

Decision:

Use a side-by-side review interface.

Reason:

Improves reviewer confidence and auditability.

Status:

Approved

Date:

2026-06-13

---

# ADR-013

Decision:

Expose approved policy JSON through APIs.

Reason:

Allows integration with booking tools, policy engines and reporting systems.

Status:

Approved

Date:

2026-06-13

---

# ADR-014

Decision:

Use event-driven architecture where practical.

Reason:

Supports scalability and loose coupling.

Status:

Approved

Date:

2026-06-13

---

# ADR-015

Decision:

Use enterprise-specific Knowledge Bases.

Reason:

Prevents cross-enterprise policy contamination.

Status:

Approved

Date:

2026-06-13

---

# ADR-016

Decision:

Store original documents indefinitely.

Reason:

Supports audit, legal and compliance requirements.

Status:

Approved

Date:

2026-06-13

---

# ADR-017

Decision:

Store original AI output indefinitely.

Reason:

Supports traceability and review analysis.

Status:

Approved

Date:

2026-06-13

---

# ADR-018

Decision:

Use strict JSON extraction outputs.

Reason:

Ensures predictable downstream integrations.

Status:

Approved

Date:

2026-06-13

---

# ADR-019

Decision:

Use API-first design.

Reason:

Third-party systems are primary consumers of policy data.

Status:

Approved

Date:

2026-06-13

---

# ADR-020

Decision:

Implement tenant-aware security at every layer.

Reason:

Prevents accidental cross-tenant data exposure.

Status:

Approved

Date:

2026-06-13