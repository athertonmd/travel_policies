import { VectorEntry, SearchResult } from '../domain/types';

/**
 * Vector store interface (ADR-010: OpenSearch).
 */
export interface VectorStore {
  upsertChunk(entry: VectorEntry): Promise<void>;
  search(enterpriseId: string, queryEmbedding: number[], limit?: number): Promise<SearchResult[]>;
  deleteByPolicyVersion(enterpriseId: string, policyVersion: number): Promise<void>;
}
