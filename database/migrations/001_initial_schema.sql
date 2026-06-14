-- TPIP Initial Schema
-- Travel Policy Intelligence Platform
-- Migration: 001_initial_schema
-- Based on: docs/steering/03-data-model-specification.md
-- Standards: All entities have created_at, updated_at, version (optimistic concurrency)
-- All entities are tenant-aware (ADR-020)
-- All timestamps stored in UTC (BR-046)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TENANTS (Data Model: Tenant)
-- Represents a Travel Management Company
-- =====================================================
CREATE TABLE tenants (
    tenant_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Archived')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ENTERPRISES (Data Model: Enterprise)
-- Represents a corporate customer (BR-002: belongs to one tenant)
-- =====================================================
CREATE TABLE enterprises (
    enterprise_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    name            VARCHAR(255) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Archived')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enterprises_tenant ON enterprises(tenant_id);

-- =====================================================
-- USERS (Data Model: User)
-- =====================================================
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    role            VARCHAR(20) NOT NULL
                    CHECK (role IN ('SystemAdmin', 'TMCAdmin', 'Reviewer', 'ReadOnly')),
    email           VARCHAR(320) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Archived')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- POLICY_DOCUMENTS (Data Model: PolicyDocument)
-- BR-005: Upload creates new version
-- BR-006: Versions are immutable
-- BR-007: Original document always retained
-- =====================================================
CREATE TABLE policy_documents (
    document_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    enterprise_id   UUID NOT NULL REFERENCES enterprises(enterprise_id),
    version_number  INTEGER NOT NULL,
    filename        VARCHAR(500) NOT NULL,
    upload_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by     UUID NOT NULL REFERENCES users(user_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'Uploaded'
                    CHECK (status IN ('Uploaded', 'Processing', 'Review', 'Approved', 'Rejected')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (enterprise_id, version_number)
);

CREATE INDEX idx_policy_documents_enterprise ON policy_documents(enterprise_id);
CREATE INDEX idx_policy_documents_tenant ON policy_documents(tenant_id);

-- =====================================================
-- EXTRACTED_POLICIES (Data Model: ExtractedPolicy)
-- BR-009: Original AI extraction always retained
-- =====================================================
CREATE TABLE extracted_policies (
    policy_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    version_number      INTEGER NOT NULL,
    extraction_model    VARCHAR(100) NOT NULL,
    extraction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_confidence  NUMERIC(5,2) NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 100),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extracted_policies_enterprise ON extracted_policies(enterprise_id);
CREATE INDEX idx_extracted_policies_tenant ON extracted_policies(tenant_id);

-- =====================================================
-- POLICY_RULES (Data Model: PolicyRule)
-- BR-013: Must contain confidence score
-- BR-014: Must contain source reference
-- BR-015: Must contain rule type
-- BR-016: Must belong to a category
-- =====================================================
CREATE TABLE policy_rules (
    rule_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    policy_id           UUID NOT NULL REFERENCES extracted_policies(policy_id),
    rule_type           VARCHAR(100) NOT NULL,
    category            VARCHAR(20) NOT NULL
                        CHECK (category IN ('Air', 'Hotel', 'Rail', 'Car', 'General')),
    value               TEXT NOT NULL,
    confidence          NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    source_reference    TEXT NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_rules_policy ON policy_rules(policy_id);
CREATE INDEX idx_policy_rules_tenant ON policy_rules(tenant_id);
CREATE INDEX idx_policy_rules_category ON policy_rules(category);

-- =====================================================
-- RULE_CORRECTIONS (Data Model: RuleCorrection)
-- BR-010: Never overwrite original AI extraction
-- BR-021: Modifications require a reason
-- ADR-009: Store reviewer corrections permanently
-- =====================================================
CREATE TABLE rule_corrections (
    correction_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    rule_id             UUID NOT NULL REFERENCES policy_rules(rule_id),
    ai_value            TEXT NOT NULL,
    reviewer_value      TEXT NOT NULL,
    reason              TEXT NOT NULL,
    reviewer            UUID NOT NULL REFERENCES users(user_id),
    correction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rule_corrections_rule ON rule_corrections(rule_id);
CREATE INDEX idx_rule_corrections_tenant ON rule_corrections(tenant_id);

-- =====================================================
-- REVIEW_SESSIONS (Data Model: ReviewSession)
-- BR-019: Every policy must pass review before publication
-- =====================================================
CREATE TABLE review_sessions (
    review_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    policy_id           UUID NOT NULL REFERENCES extracted_policies(policy_id),
    reviewer            UUID NOT NULL REFERENCES users(user_id),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_sessions_policy ON review_sessions(policy_id);
CREATE INDEX idx_review_sessions_tenant ON review_sessions(tenant_id);

-- =====================================================
-- POLICY_COMPARISONS (Data Model: PolicyComparison)
-- BR-025: Every new version compared against latest approved
-- =====================================================
CREATE TABLE policy_comparisons (
    comparison_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    old_version         INTEGER NOT NULL,
    new_version         INTEGER NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_comparisons_enterprise ON policy_comparisons(enterprise_id);
CREATE INDEX idx_policy_comparisons_tenant ON policy_comparisons(tenant_id);

-- =====================================================
-- POLICY_CHANGES (Data Model: PolicyChange)
-- BR-026: Changes classified as Added/Removed/Modified
-- BR-027: Change history retained permanently
-- =====================================================
CREATE TABLE policy_changes (
    change_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    comparison_id       UUID NOT NULL REFERENCES policy_comparisons(comparison_id),
    rule_type           VARCHAR(100) NOT NULL,
    old_value           TEXT,
    new_value           TEXT,
    change_type         VARCHAR(20) NOT NULL
                        CHECK (change_type IN ('Added', 'Removed', 'Modified')),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_changes_comparison ON policy_changes(comparison_id);
CREATE INDEX idx_policy_changes_tenant ON policy_changes(tenant_id);

-- =====================================================
-- KNOWLEDGE_BASE_DOCUMENTS (Data Model: KnowledgeBaseDocument)
-- ADR-015: Enterprise-specific knowledge bases
-- =====================================================
CREATE TABLE knowledge_base_documents (
    kb_document_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    version_number      INTEGER NOT NULL,
    embedding_reference VARCHAR(500) NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_docs_enterprise ON knowledge_base_documents(enterprise_id);
CREATE INDEX idx_knowledge_base_docs_tenant ON knowledge_base_documents(tenant_id);

-- =====================================================
-- AUDIT_LOGS (Data Model: AuditLog)
-- BR-043: All user actions generate audit records
-- BR-044: Audit records are immutable
-- BR-045: Must include user, timestamp, entity, action
-- =====================================================
CREATE TABLE audit_logs (
    audit_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id             UUID NOT NULL REFERENCES users(user_id),
    entity_type         VARCHAR(100) NOT NULL,
    entity_id           UUID NOT NULL,
    action              VARCHAR(100) NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
