# Knowledge Base Specification

## Purpose

Defines how policy content is stored, indexed, searched and retrieved using Retrieval Augmented Generation (RAG).

The Knowledge Base exists to:

- Improve policy extraction accuracy
- Preserve reviewer corrections
- Support semantic search
- Support future AI assistants
- Support future policy question-answering

The Knowledge Base is not the system of record.

Aurora PostgreSQL remains the system of record.

---

# Architecture

Document

↓

Textract

↓

Chunking

↓

Embedding Generation

↓

OpenSearch Vector Index

↓

Semantic Retrieval

---

# Enterprise Isolation

Each enterprise shall have logical isolation.

A search request must never return content from another enterprise.

Enterprise isolation is mandatory.

---

# Data Sources

Knowledge Base content may originate from:

- Policy documents
- Approved policy versions
- Reviewer corrections
- Policy comparisons
- Change history

---

# Chunking Strategy

Documents shall be chunked before embedding.

Target chunk size:

1000-1500 characters

Overlap:

150-250 characters

Chunk boundaries should align with:

- Headings
- Sections
- Paragraph groups

---

# Embedding Strategy

Provider:

Amazon Bedrock

Embeddings generated for:

- Policy text
- Reviewer corrections
- Approved rule explanations

Embeddings regenerated when:

- New policy version published
- Corrections added

---

# Retrieval Process

User Query

↓

Enterprise Filter

↓

Vector Search

↓

Top Matches

↓

Context Assembly

↓

Response

---

# Retrieval Limits

Default:

Top 10 chunks

Maximum:

Top 25 chunks

---

# Metadata Requirements

Each chunk must store:

- enterprise_id
- policy_version
- document_id
- page_number
- section_reference
- created_at

---

# Correction Memory

Reviewer corrections shall be indexed.

Example:

AI extracted:

Business Class > 6 hours

Reviewer changed:

Business Class > 8 hours

Correction becomes searchable context for future extractions.

---

# Future Capabilities

Future releases may support:

- Policy question answering
- AI policy assistants
- Policy drafting
- Policy benchmarking
- Compliance reasoning

These capabilities must use the existing Knowledge Base architecture.

---

# Security

Knowledge Base access requires authentication.

Enterprise boundaries must be enforced at retrieval time.

All queries must be logged.

---

# Performance Targets

Vector Search:

< 2 seconds

Knowledge Base Query:

< 5 seconds

Embedding Generation:

< 30 seconds per document

---

# Retention

Knowledge Base records shall be retained indefinitely.

Knowledge Base records shall be version aware.

Historical policy versions must remain searchable.