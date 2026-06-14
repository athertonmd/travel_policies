import { VectorStore } from './vector-store';
import { VectorEntry, SearchResult } from '../domain/types';
import { VectorStoreError } from '../domain/errors';

/**
 * In-memory vector store for testing.
 * Simulates OpenSearch vector search with cosine similarity.
 */
export class InMemoryVectorStore implements VectorStore {
  private entries: VectorEntry[] = [];
  private shouldFail = false;

  setFailure(fail: boolean): void {
    this.shouldFail = fail;
  }

  async upsertChunk(entry: VectorEntry): Promise<void> {
    if (this.shouldFail) throw new VectorStoreError('Vector store unavailable');
    const idx = this.entries.findIndex((e) => e.chunk_id === entry.chunk_id);
    if (idx >= 0) {
      this.entries[idx] = { ...entry };
    } else {
      this.entries.push({ ...entry });
    }
  }

  async search(enterpriseId: string, queryEmbedding: number[], limit = 10): Promise<SearchResult[]> {
    if (this.shouldFail) throw new VectorStoreError('Vector store unavailable');

    // Filter by enterprise (ADR-015: enterprise-specific knowledge bases)
    const filtered = this.entries.filter((e) => e.enterprise_id === enterpriseId);

    // Calculate cosine similarity
    const scored = filtered.map((entry) => ({
      entry,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ entry, score }) => ({
      chunkId: entry.chunk_id,
      sourceType: entry.metadata.source_type,
      policyVersion: `v${entry.metadata.policy_version}`,
      pageNumber: entry.metadata.page_number,
      sectionReference: entry.metadata.section_reference,
      text: entry.metadata.chunk_text,
      score,
      metadata: { document_id: entry.metadata.document_id, policy_id: entry.metadata.policy_id },
    }));
  }

  async deleteByPolicyVersion(enterpriseId: string, policyVersion: number): Promise<void> {
    if (this.shouldFail) throw new VectorStoreError('Vector store unavailable');
    this.entries = this.entries.filter(
      (e) => !(e.enterprise_id === enterpriseId && e.metadata.policy_version === policyVersion),
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  getEntryCount(): number { return this.entries.length; }
  clear(): void { this.entries = []; this.shouldFail = false; }
}
