import { EmbeddingProvider } from './embedding-provider';
import { EmbeddingResult } from '../domain/types';
import { EmbeddingError } from '../domain/errors';

/**
 * In-memory embedding provider for testing.
 * Generates deterministic pseudo-embeddings from text hash.
 */
export class InMemoryEmbeddingProvider implements EmbeddingProvider {
  private failures = new Set<string>();

  setFailure(enterpriseId: string): void {
    this.failures.add(enterpriseId);
  }

  async createEmbedding(input: {
    text: string;
    enterprise_id: string;
    policy_version: number;
  }): Promise<EmbeddingResult> {
    if (this.failures.has(input.enterprise_id)) {
      throw new EmbeddingError('Embedding generation failed');
    }

    // Generate a deterministic pseudo-embedding (128 dimensions)
    const embedding = Array.from({ length: 128 }, (_, i) => {
      const charCode = input.text.charCodeAt(i % input.text.length) || 0;
      return (charCode / 255) * 2 - 1; // normalize to [-1, 1]
    });

    return {
      embedding,
      model_name: 'bedrock-embedding-mock',
      created_at: new Date().toISOString(),
    };
  }

  clear(): void {
    this.failures.clear();
  }
}
