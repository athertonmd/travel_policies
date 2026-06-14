-- Migration: 007_policy_publication
-- Project 7: Policy Publication & Version Comparison

-- Approved policies table
CREATE TABLE IF NOT EXISTS approved_policies (
    policy_id           UUID PRIMARY KEY,
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    version_number      INTEGER NOT NULL,
    approved_policy_json JSONB NOT NULL,
    approved_at         TIMESTAMPTZ NOT NULL,
    approved_by         UUID NOT NULL REFERENCES users(user_id),
    published_at        TIMESTAMPTZ,
    published_by        UUID REFERENCES users(user_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'Approved'
                        CHECK (status IN ('Draft', 'Review', 'Approved', 'Published', 'Superseded', 'Rejected')),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (enterprise_id, version_number)
);

CREATE INDEX idx_approved_policies_enterprise ON approved_policies(enterprise_id);
CREATE INDEX idx_approved_policies_tenant ON approved_policies(tenant_id);
CREATE INDEX idx_approved_policies_status ON approved_policies(status);
CREATE INDEX idx_approved_policies_current ON approved_policies(enterprise_id, status) WHERE status = 'Published';
