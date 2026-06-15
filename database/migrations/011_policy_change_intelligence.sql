-- Migration: 011_policy_change_intelligence
-- Project 13: Policy Change Intelligence

CREATE TABLE IF NOT EXISTS policy_change_summaries (
    summary_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    comparison_id       UUID NOT NULL REFERENCES policy_comparisons(comparison_id),
    policy_id           UUID NOT NULL,
    generated_summary   JSONB NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_name          VARCHAR(100) NOT NULL
);

CREATE INDEX idx_change_summaries_enterprise ON policy_change_summaries(enterprise_id);
CREATE INDEX idx_change_summaries_policy ON policy_change_summaries(policy_id);
