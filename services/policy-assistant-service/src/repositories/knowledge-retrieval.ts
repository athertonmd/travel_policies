import { RetrievedChunk } from '../domain/types';

/**
 * Knowledge retrieval interface — wraps the KB service search.
 */
export interface KnowledgeRetrieval {
  retrieve(enterpriseId: string, query: string, limit?: number): Promise<RetrievedChunk[]>;
}
