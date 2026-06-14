-- Migration: 010_policy_assistant
-- Project 12: Policy Q&A Assistant

CREATE TABLE IF NOT EXISTS policy_conversations (
    conversation_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id       UUID NOT NULL REFERENCES enterprises(enterprise_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id             UUID NOT NULL REFERENCES users(user_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_conversations_enterprise ON policy_conversations(enterprise_id);
CREATE INDEX idx_policy_conversations_tenant ON policy_conversations(tenant_id);

CREATE TABLE IF NOT EXISTS policy_messages (
    message_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL REFERENCES policy_conversations(conversation_id),
    role                VARCHAR(10) NOT NULL CHECK (role IN ('User', 'Assistant')),
    content             TEXT NOT NULL,
    citations           JSONB,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_messages_conversation ON policy_messages(conversation_id);
CREATE INDEX idx_policy_messages_timestamp ON policy_messages(timestamp);
