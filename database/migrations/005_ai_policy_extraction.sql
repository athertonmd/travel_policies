-- Migration: 005_ai_policy_extraction
-- Project 5: AI Policy Extraction
-- Adds raw_ai_output column and extends policy_rules with AI extraction fields

-- Add raw AI output storage to extracted_policies (BR-009, ADR-017)
ALTER TABLE extracted_policies
    ADD COLUMN IF NOT EXISTS raw_ai_output JSONB;

-- Add AI extraction fields to policy_rules
ALTER TABLE policy_rules
    ADD COLUMN IF NOT EXISTS ai_generated_value TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_value TEXT,
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'PendingReview'
        CHECK (review_status IN ('PendingReview', 'Approved', 'Modified', 'Rejected'));

-- Index for review status queries
CREATE INDEX IF NOT EXISTS idx_policy_rules_review_status ON policy_rules(review_status);

-- Index for low confidence rules requiring review (BR-017, BR-018)
CREATE INDEX IF NOT EXISTS idx_policy_rules_low_confidence ON policy_rules(confidence)
    WHERE confidence < 80;
