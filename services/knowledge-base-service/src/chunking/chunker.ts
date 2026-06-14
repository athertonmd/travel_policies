import { v4 as uuidv4 } from 'uuid';
import { KBChunk, ChunkSourceType, CHUNK_CONFIG } from '../domain/types';

/**
 * Document chunking service.
 * Target: 1000-1500 chars, 150-250 char overlap.
 */
export function chunkText(
  text: string,
  metadata: {
    enterprise_id: string;
    tenant_id: string;
    document_id: string | null;
    policy_id: string | null;
    policy_version: number;
    page_number: number | null;
    section_reference: string | null;
    source_type: ChunkSourceType;
  },
): KBChunk[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: KBChunk[] = [];
  const { targetSize, overlap } = CHUNK_CONFIG;
  let start = 0;
  const now = new Date().toISOString();

  while (start < text.length) {
    let end = Math.min(start + targetSize, text.length);

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + CHUNK_CONFIG.minSize) {
        end = breakPoint + 1;
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        chunk_id: uuidv4(),
        enterprise_id: metadata.enterprise_id,
        tenant_id: metadata.tenant_id,
        document_id: metadata.document_id,
        policy_id: metadata.policy_id,
        policy_version: metadata.policy_version,
        page_number: metadata.page_number,
        section_reference: metadata.section_reference,
        chunk_text: chunkText,
        source_type: metadata.source_type,
        created_at: now,
      });
    }

    start = end - overlap;
    if (start >= text.length) break;
    if (end >= text.length) break;
  }

  return chunks;
}
