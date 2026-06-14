/**
 * Policy Assistant domain types.
 * Project 12: Policy Q&A Assistant (RAG).
 */

/** Citation for an answer */
export interface Citation {
  policy_version: string;
  page_number: number | null;
  section_reference: string | null;
  source_type: string;
  source_text: string;
}

/** Assistant answer */
export interface AssistantAnswer {
  answer: string;
  confidence: number;
  citations: Citation[];
}

/** Conversation entity */
export interface PolicyConversation {
  conversation_id: string;
  enterprise_id: string;
  tenant_id: string;
  user_id: string;
  created_at: string;
}

/** Message entity */
export interface PolicyMessage {
  message_id: string;
  conversation_id: string;
  role: 'User' | 'Assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

/** Retrieved context chunk for prompt assembly */
export interface RetrievedChunk {
  chunk_id: string;
  text: string;
  policy_version: string;
  page_number: number | null;
  section_reference: string | null;
  source_type: string;
  score: number;
}

/** AI provider input */
export interface AssistantInput {
  enterprise_id: string;
  question: string;
  retrieved_context: RetrievedChunk[];
  conversation_history: PolicyMessage[];
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

/** No-answer threshold */
export const NO_ANSWER_CONFIDENCE_THRESHOLD = 0.3;
