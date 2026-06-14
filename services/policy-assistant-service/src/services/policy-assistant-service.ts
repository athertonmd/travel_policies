import { v4 as uuidv4 } from 'uuid';
import {
  AssistantAnswer,
  PolicyConversation,
  PolicyMessage,
  CallerContext,
  AuditEntry,
} from '../domain/types';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { PolicyAssistantProvider } from '../ai/policy-assistant-provider';
import { KnowledgeRetrieval } from '../repositories/knowledge-retrieval';
import { ConversationRepository } from '../repositories/conversation-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { EventBus } from '../events/event-bus';
import { BaseEvent } from '@tpip/event-contracts';

/**
 * Policy Assistant Service — RAG-based Q&A.
 *
 * - Retrieves enterprise-scoped KB chunks
 * - Assembles prompt with context
 * - Generates answer with citations
 * - Stores conversation history
 * - Refuses answers when insufficient evidence (hallucination prevention)
 */
export class PolicyAssistantService {
  constructor(
    private readonly aiProvider: PolicyAssistantProvider,
    private readonly knowledgeRetrieval: KnowledgeRetrieval,
    private readonly conversationRepo: ConversationRepository,
    private readonly auditRepo: AuditRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Answer a policy question.
   */
  async askQuestion(
    enterpriseId: string,
    tenantId: string,
    question: string,
    conversationId: string | null,
    caller: CallerContext,
  ): Promise<{ answer: AssistantAnswer; conversation_id: string }> {
    this.assertAccess(caller, tenantId);

    const now = new Date().toISOString();

    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const conv: PolicyConversation = {
        conversation_id: uuidv4(),
        enterprise_id: enterpriseId,
        tenant_id: tenantId,
        user_id: caller.user_id,
        created_at: now,
      };
      await this.conversationRepo.createConversation(conv);
      convId = conv.conversation_id;
    }

    // Store user message
    await this.conversationRepo.addMessage({
      message_id: uuidv4(),
      conversation_id: convId,
      role: 'User',
      content: question,
      timestamp: now,
    });

    // Retrieve context from knowledge base (enterprise-scoped)
    const retrievedContext = await this.knowledgeRetrieval.retrieve(enterpriseId, question);

    // Get conversation history
    const history = await this.conversationRepo.getMessages(convId);

    // Call AI provider
    const answer = await this.aiProvider.answerQuestion({
      enterprise_id: enterpriseId,
      question,
      retrieved_context: retrievedContext,
      conversation_history: history,
    });

    // Store assistant message
    await this.conversationRepo.addMessage({
      message_id: uuidv4(),
      conversation_id: convId,
      role: 'Assistant',
      content: answer.answer,
      citations: answer.citations,
      timestamp: new Date().toISOString(),
    });

    // Events
    await this.eventBus.publish(this.buildEvent('PolicyQuestionAsked', tenantId, { enterprise_id: enterpriseId, conversation_id: convId }));
    await this.eventBus.publish(this.buildEvent('PolicyAnswerGenerated', tenantId, { enterprise_id: enterpriseId, conversation_id: convId, confidence: answer.confidence }));

    // Audit
    await this.auditRepo.create(this.buildAudit(caller, 'PolicyAssistant', convId, 'QuestionSubmitted'));
    await this.auditRepo.create(this.buildAudit(caller, 'PolicyAssistant', convId, 'AnswerGenerated'));

    return { answer, conversation_id: convId };
  }

  /**
   * Get conversations for an enterprise.
   */
  async getConversations(
    enterpriseId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<PolicyConversation[]> {
    this.assertAccess(caller, tenantId);
    return this.conversationRepo.findByEnterprise(enterpriseId);
  }

  /**
   * Get conversation with messages.
   */
  async getConversation(
    conversationId: string,
    tenantId: string,
    caller: CallerContext,
  ): Promise<{ conversation: PolicyConversation; messages: PolicyMessage[] }> {
    this.assertAccess(caller, tenantId);

    const conversation = await this.conversationRepo.findConversation(conversationId);
    if (!conversation || conversation.tenant_id !== tenantId) {
      if (caller.role !== 'SystemAdmin') {
        throw new NotFoundError('Conversation', conversationId);
      }
      if (!conversation) throw new NotFoundError('Conversation', conversationId);
    }

    const messages = await this.conversationRepo.getMessages(conversationId);

    await this.auditRepo.create(this.buildAudit(caller, 'PolicyAssistant', conversationId, 'ConversationViewed'));

    return { conversation, messages };
  }

  private assertAccess(caller: CallerContext, tenantId: string): void {
    if (caller.role === 'SystemAdmin') return;
    if (caller.tenant_id !== tenantId) {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  }

  private buildEvent(type: string, tenantId: string, payload: Record<string, unknown>): BaseEvent {
    return {
      event_id: uuidv4(),
      event_type: type,
      event_version: '1.0',
      timestamp: new Date().toISOString(),
      correlation_id: uuidv4(),
      tenant_id: tenantId,
      source: 'policy-assistant-service',
      payload,
    } as unknown as BaseEvent;
  }

  private buildAudit(caller: CallerContext, entityType: string, entityId: string, action: string): AuditEntry {
    return {
      audit_id: uuidv4(),
      tenant_id: caller.tenant_id,
      user_id: caller.user_id,
      entity_type: entityType,
      entity_id: entityId,
      action,
      timestamp: new Date().toISOString(),
    };
  }
}
