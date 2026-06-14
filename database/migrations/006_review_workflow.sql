-- Migration: 006_review_workflow
-- Project 6: Human Review Workflow
-- Adds review session status and correction tracking

-- Update review_sessions to support new status model
ALTER TABLE review_sessions
    ADD COLUMN IF NOT EXISTS enterprise_id UUID REFERENCES enterprises(enterprise_id),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'NotStarted'
        CHECK (status IN ('NotStarted', 'InProgress', 'Completed', 'Cancelled'));

CREATE INDEX IF NOT EXISTS idx_review_sessions_status ON review_sessions(status);
CREATE INDEX IF NOT EXISTS idx_review_sessions_enterprise ON review_sessions(enterprise_id);
