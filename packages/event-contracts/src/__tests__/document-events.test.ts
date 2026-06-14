import { describe, it, expect } from 'vitest';
import {
  PolicyDocumentUploadedSchema,
  PolicyDocumentProcessingStartedSchema,
  PolicyDocumentTextExtractedSchema,
  PolicyDocumentExtractionCompletedSchema,
  PolicyDocumentExtractionFailedSchema,
} from '../document-events';

const baseEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_version: '1.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  correlation_id: '550e8400-e29b-41d4-a716-446655440001',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'document-service',
};

describe('PolicyDocumentUploaded event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentUploaded',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        enterprise_id: '550e8400-e29b-41d4-a716-446655440011',
        version_number: 1,
      },
    };
    expect(PolicyDocumentUploadedSchema.safeParse(event).success).toBe(true);
  });

  it('should reject negative version_number', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentUploaded',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        enterprise_id: '550e8400-e29b-41d4-a716-446655440011',
        version_number: -1,
      },
    };
    expect(PolicyDocumentUploadedSchema.safeParse(event).success).toBe(false);
  });
});

describe('PolicyDocumentProcessingStarted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentProcessingStarted',
      payload: { document_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(PolicyDocumentProcessingStartedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyDocumentTextExtracted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentTextExtracted',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        page_count: 5,
      },
    };
    expect(PolicyDocumentTextExtractedSchema.safeParse(event).success).toBe(true);
  });

  it('should reject zero page_count', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentTextExtracted',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        page_count: 0,
      },
    };
    expect(PolicyDocumentTextExtractedSchema.safeParse(event).success).toBe(false);
  });
});

describe('PolicyDocumentExtractionCompleted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentExtractionCompleted',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        policy_id: '550e8400-e29b-41d4-a716-446655440020',
      },
    };
    expect(PolicyDocumentExtractionCompletedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyDocumentExtractionFailed event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDocumentExtractionFailed',
      payload: {
        document_id: '550e8400-e29b-41d4-a716-446655440010',
        error_message: 'Textract processing failed',
      },
    };
    expect(PolicyDocumentExtractionFailedSchema.safeParse(event).success).toBe(true);
  });
});
