-- Migration: 012_compliance_engine
-- Project 14: Compliance Evaluation Engine

CREATE TABLE IF NOT EXISTS compliance_evaluations (
    evaluation_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id   UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    policy_version  VARCHAR(20) NOT NULL,
    booking_data    JSONB NOT NULL,
    result          JSONB NOT NULL,
    score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    compliant       BOOLEAN NOT NULL,
    evaluation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_eval_enterprise ON compliance_evaluations(enterprise_id);
CREATE INDEX idx_compliance_eval_tenant ON compliance_evaluations(tenant_id);

CREATE TABLE IF NOT EXISTS compliance_violations (
    violation_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id   UUID NOT NULL REFERENCES compliance_evaluations(evaluation_id),
    rule_type       VARCHAR(20) NOT NULL,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('Fail', 'Warning')),
    message         TEXT NOT NULL,
    actual_value    TEXT,
    required_value  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_violations_eval ON compliance_violations(evaluation_id);
