import { PolicyExtractionInput, PolicyExtractionOutput } from '../domain/ai-types';

/**
 * Policy AI Provider interface (ADR-005: Amazon Bedrock Claude Sonnet).
 * In production, integrates with Amazon Bedrock.
 * Temperature: 0.1, Output: Strict JSON.
 */
export interface PolicyAIProvider {
  extractPolicy(input: PolicyExtractionInput): Promise<PolicyExtractionOutput>;
}
