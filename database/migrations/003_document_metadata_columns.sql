-- Migration: 003_document_metadata_columns
-- Project 3: Document Management
-- Adds metadata columns to policy_documents required for upload tracking

ALTER TABLE policy_documents
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS storage_location VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);

-- Remove defaults after backfill (they exist only for migration compatibility)
COMMENT ON COLUMN policy_documents.content_type IS 'MIME type: application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document';
COMMENT ON COLUMN policy_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN policy_documents.storage_location IS 'S3 URI: s3://policy-documents/{tenant}/{enterprise}/v{n}/{filename}';
COMMENT ON COLUMN policy_documents.checksum IS 'SHA-256 hex digest of file content';
