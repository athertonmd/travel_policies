import { KnowledgeRetrieval } from '../knowledge-retrieval';
import { RetrievedChunk } from '../../domain/types';

export class InMemoryKnowledgeRetrieval implements KnowledgeRetrieval {
  private chunks = new Map<string, RetrievedChunk[]>();

  setChunks(enterpriseId: string, chunks: RetrievedChunk[]): void {
    this.chunks.set(enterpriseId, chunks.map((c) => ({ ...c })));
  }

  async retrieve(enterpriseId: string, _query: string, limit = 10): Promise<RetrievedChunk[]> {
    const results = this.chunks.get(enterpriseId) || [];
    return results.slice(0, limit);
  }

  clear(): void { this.chunks.clear(); }
}
