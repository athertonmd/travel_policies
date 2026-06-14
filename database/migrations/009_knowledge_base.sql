-- Migration: 009_knowledge_base
-- Project 9: Knowledge Base & RAG Correction Memory

-- Knowledge base chunks metadata (Aurora reference, vector stored in OpenSearch)
CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
    chunk_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    document_id         UUID REFERENCES policy_documents(document_id),
    policy_id           UUID,
    policy_version      INTEGER NOT NULL,
    page_number         INTEGER,
    section_reference   VARCHAR(255),
    chunk_text          TEXT NOT NULL,
    source_type         VARCHAR(30) NOT NULL
                        CHECK (source_type IN ('DocumentText', 'ApprovedPolicy', 'ReviewerCorrection', 'PolicyChange')),
    embedding_reference VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_chunks_enterprise ON knowledge_base_chunks(enterprise_id);
CREATE INDEX idx_kb_chunks_tenant ON knowledge_base_chunks(tenant_id);
CREATE INDEX idx_kb_chunks_source ON knowledge_base_chunks(source_type);
CREATE INDEX idx_kb_chunks_policy_version ON knowledge_base_chunks(enterprise_id, policy_version);

-- Knowledge base query log
CREATE TABLE IF NOT EXISTS knowledge_base_queries (
    query_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id             UUID NOT NULL REFERENCES users(user_id),
    query_text          TEXT NOT NULL,
    results_count       INTEGER NOT NULL DEFAULT 0,
    query_timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_queries_enterprise ON knowledge_base_queries(enterprise_id);
CREATE INDEX idx_kb_queries_tenant ON knowledge_base_queries(tenant_id);
