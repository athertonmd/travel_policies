import { EmbeddingResult } from '../domain/types';

/**
 * Embedding provider interface (ADR-010: OpenSearch, Bedrock for embeddings).
 */
export interface EmbeddingProvider {
  createEmbedding(input: {
    text: string;
    enterprise_id: string;
    policy_version: number;
    metadata?: Record<string, unknown>;
  }): Promise<EmbeddingResult>;
}
