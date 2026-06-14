# Architecture Specification

## Purpose

Defines the approved architecture for TPIP.

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- AWS Lambda
- API Gateway
- TypeScript

## Database

- Aurora PostgreSQL

Aurora is the system of record.

## Storage

Amazon S3

Buckets:

- policy-documents
- policy-text
- policy-json
- policy-exports

Versioning enabled.

## OCR

Amazon Textract

## AI

Amazon Bedrock

Primary model:

Claude Sonnet

Temperature:

0.1

## Knowledge Base

Amazon OpenSearch

Vector Search enabled.

## Authentication

Amazon Cognito

## Monitoring

Amazon CloudWatch

---

# Services

## Identity Service

Authentication and authorization.

## Enterprise Service

Tenant and enterprise management.

## Document Service

Document upload and storage.

## Extraction Service

OCR and AI extraction.

## Review Service

Human review workflows.

## Knowledge Base Service

Embeddings and semantic search.

## Policy API Service

Policy retrieval APIs.

---

# Architecture Rules

- No business logic in frontend
- All APIs stateless
- Multi-tenant isolation mandatory
- All services independently deployable
- Event-driven communication preferred
- No direct database access from frontend

---

# Security Requirements

- TLS 1.2+
- Encryption at rest
- Least privilege IAM
- Immutable audit logs
- Tenant isolation

---

# Environments

- Development
- Test
- Production

No direct production changes permitted.