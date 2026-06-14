export { DocumentProcessingService } from './services/document-processing-service';
export { PolicyExtractionService } from './services/policy-extraction-service';
export { createExtractionRoutes } from './api/routes';
export { InMemoryEventBus } from './events/event-bus';
export type { EventBus } from './events/event-bus';
export type { ExtractedTextRepository } from './repositories/extracted-text-repository';
export type { DocumentLookup } from './repositories/document-lookup';
export type { AuditRepository } from './repositories/audit-repository';
export type { ExtractedPolicyRepository, PolicyRuleRepository } from './repositories/policy-repository';
export type { TextractProvider } from './textract/textract-provider';
export type { PolicyAIProvider } from './ai/policy-ai-provider';
export { InMemoryTextractProvider } from './textract/in-memory-textract';
export { InMemoryPolicyAIProvider } from './ai/in-memory-policy-ai-provider';
export {
  InMemoryExtractedTextRepository,
  InMemoryDocumentLookup,
  InMemoryAuditRepository,
  InMemoryExtractedPolicyRepository,
  InMemoryPolicyRuleRepository,
} from './repositories/in-memory';
export * from './domain/types';
export * from './domain/ai-types';
export * from './domain/errors';
