-- Migration: 004_extracted_document_text
-- Project 4: OCR & Document Processing
-- Creates table for storing extracted text per page (BR-008: retain original)

CREATE TABLE extracted_document_text (
    extracted_text_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID NOT NULL REFERENCES policy_documents(document_id),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
    page_number         INTEGER NOT NULL CHECK (page_number > 0),
    page_text           TEXT NOT NULL,
    extraction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, page_number)
);

CREATE INDEX idx_extracted_text_document ON extracted_document_text(document_id);
CREATE INDEX idx_extracted_text_tenant ON extracted_document_text(tenant_id);
CREATE INDEX idx_extracted_text_page ON extracted_document_text(document_id, page_number);

-- Add TextExtracted and ExtractionFailed to policy_documents status constraint
ALTER TABLE policy_documents DROP CONSTRAINT IF EXISTS policy_documents_status_check;
ALTER TABLE policy_documents ADD CONSTRAINT policy_documents_status_check
    CHECK (status IN ('Uploaded', 'Processing', 'TextExtracted', 'ExtractionFailed', 'Review', 'Approved', 'Rejected', 'Archived'));
