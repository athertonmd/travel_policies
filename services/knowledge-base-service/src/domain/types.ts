/**
 * Knowledge Base domain types.
 * Project 9: Based on docs/steering/08-knowledge-base-specification.md
 */

/** Source types for indexed chunks */
export type ChunkSourceType = 'DocumentText' | 'ApprovedPolicy' | 'ReviewerCorrection' | 'PolicyChange';

/** Knowledge base chunk */
export interface KBChunk {
  chunk_id: string;
  enterprise_id: string;
  tenant_id: string;
  document_id: string | null;
  policy_id: string | null;
  policy_version: number;
  page_number: number | null;
  section_reference: string | null;
  chunk_text: string;
  source_type: ChunkSourceType;
  created_at: string;
}

/** Embedding result */
export interface EmbeddingResult {
  embedding: number[];
  model_name: string;
  created_at: string;
}

/** Vector store entry (chunk + embedding) */
export interface VectorEntry {
  chunk_id: string;
  enterprise_id: string;
  embedding: number[];
  metadata: KBChunk;
}

/** Search result */
export interface SearchResult {
  chunkId: string;
  sourceType: ChunkSourceType;
  policyVersion: string;
  pageNumber: number | null;
  sectionReference: string | null;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

/** Search response */
export interface SearchResponse {
  enterpriseId: string;
  query: string;
  results: SearchResult[];
}

/** Correction context for future extraction prompts */
export interface CorrectionContext {
  rule_type: string;
  ai_value: string;
  reviewer_value: string;
  reason: string;
  policy_version: number;
  timestamp: string;
}

/** Caller context */
export interface CallerContext {
  user_id: string;
  tenant_id: string;
  role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';
}

/** Audit entry */
export interface AuditEntry {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}

/** Chunking configuration */
export const CHUNK_CONFIG = {
  targetSize: 1200,
  minSize: 1000,
  maxSize: 1500,
  overlap: 200,
} as const;
