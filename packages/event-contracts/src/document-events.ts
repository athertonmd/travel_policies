import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Document Events (Event Catalogue: Document Events)
 */

export const PolicyDocumentUploadedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDocumentUploaded'),
  payload: z.object({
    document_id: z.string().uuid(),
    enterprise_id: z.string().uuid(),
    version_number: z.number().int().positive(),
  }),
});

export const PolicyDocumentProcessingStartedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDocumentProcessingStarted'),
  payload: z.object({
    document_id: z.string().uuid(),
  }),
});

export const PolicyDocumentTextExtractedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDocumentTextExtracted'),
  payload: z.object({
    document_id: z.string().uuid(),
    page_count: z.number().int().positive(),
  }),
});

export const PolicyDocumentExtractionCompletedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDocumentExtractionCompleted'),
  payload: z.object({
    document_id: z.string().uuid(),
    policy_id: z.string().uuid(),
  }),
});

export const PolicyDocumentExtractionFailedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDocumentExtractionFailed'),
  payload: z.object({
    document_id: z.string().uuid(),
    error_message: z.string(),
  }),
});

export type PolicyDocumentUploaded = z.infer<typeof PolicyDocumentUploadedSchema>;
export type PolicyDocumentProcessingStarted = z.infer<typeof PolicyDocumentProcessingStartedSchema>;
export type PolicyDocumentTextExtracted = z.infer<typeof PolicyDocumentTextExtractedSchema>;
export type PolicyDocumentExtractionCompleted = z.infer<
  typeof PolicyDocumentExtractionCompletedSchema
>;
export type PolicyDocumentExtractionFailed = z.infer<typeof PolicyDocumentExtractionFailedSchema>;
