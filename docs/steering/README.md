# Travel Policy Intelligence Platform (TPIP)

## Steering Document Index

This folder contains the authoritative design documents for the Travel Policy Intelligence Platform.

All implementation must comply with these documents.

If implementation conflicts with a steering document, the steering document takes precedence.

---

## Documents

### 01-prd.md

Defines:

- Business objectives
- User roles
- Functional requirements
- Non-functional requirements
- MVP scope
- Future roadmap

### 02-architecture-specification.md

Defines:

- AWS architecture
- Service boundaries
- Security model
- Deployment standards

### 03-data-model-specification.md

Defines:

- Core entities
- Relationships
- Multi-tenant model
- Versioning model

### 04-event-catalogue.md

Defines:

- Domain events
- Event payloads
- Event ownership

---

## Architectural Principles

1. AWS Native
2. Serverless First
3. API First
4. Multi-Tenant by Design
5. Human-In-The-Loop Validation
6. Event Driven
7. Version Everything
8. Audit Everything

---

## Development Rules

Before implementing any feature:

1. Review relevant steering documents.
2. Confirm entity definitions exist.
3. Confirm event definitions exist.
4. Reuse existing services.
5. Do not modify architecture without approval.
6. Do not modify schemas without approval.

---

## Delivery Strategy

Project 1 – Foundation

Project 2 – Enterprise Management

Project 3 – Document Management

Project 4 – OCR Integration

Project 5 – AI Extraction

Project 6 – Human Review

Project 7 – Policy API

Project 8 – Knowledge Base

Project 9 – Administration Dashboard

Project 10 – Reporting

No project should attempt multiple domains simultaneously.