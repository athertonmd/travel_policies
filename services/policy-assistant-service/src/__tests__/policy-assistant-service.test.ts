import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyAssistantService } from '../services/policy-assistant-service';
import { InMemoryPolicyAssistantProvider } from '../ai/in-memory-assistant-provider';
import { InMemoryConversationRepository } from '../repositories/in-memory/in-memory-conversation-repository';
import { InMemoryKnowledgeRetrieval } from '../repositories/in-memory/in-memory-knowledge-retrieval';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, RetrievedChunk } from '../domain/types';

describe('PolicyAssistantService', () => {
  let aiProvider: InMemoryPolicyAssistantProvider;
  let knowledgeRetrieval: InMemoryKnowledgeRetrieval;
  let conversationRepo: InMemoryConversationRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: PolicyAssistantService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';
  const otherEnterpriseId = '550e8400-e29b-41d4-a716-446655440011';

  const caller: CallerContext = { user_id: 'user1', tenant_id: tenantId, role: 'TMCAdmin' };
  const systemAdmin: CallerContext = { user_id: 'admin1', tenant_id: 'admin-tenant', role: 'SystemAdmin' };
  const otherTenantCaller: CallerContext = { user_id: 'user2', tenant_id: otherTenantId, role: 'TMCAdmin' };

  const policyChunks: RetrievedChunk[] = [
    { chunk_id: 'c1', text: 'Business class is permitted on flights exceeding 8 hours duration.', policy_version: 'v5', page_number: 14, section_reference: '3.2', source_type: 'DocumentText', score: 0.95 },
    { chunk_id: 'c2', text: 'The maximum nightly hotel rate in London is £300.', policy_version: 'v5', page_number: 21, section_reference: '5.1', source_type: 'DocumentText', score: 0.88 },
  ];

  beforeEach(() => {
    aiProvider = new InMemoryPolicyAssistantProvider();
    knowledgeRetrieval = new InMemoryKnowledgeRetrieval();
    conversationRepo = new InMemoryConversationRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new PolicyAssistantService(aiProvider, knowledgeRetrieval, conversationRepo, auditRepo, eventBus);

    knowledgeRetrieval.setChunks(enterpriseId, policyChunks);
  });

  describe('Successful question answering', () => {
    it('should answer a question with citations', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'Can I fly business class?', null, caller);
      expect(result.answer.answer).toContain('Business class');
      expect(result.answer.citations.length).toBeGreaterThan(0);
      expect(result.conversation_id).toBeDefined();
    });

    it('should return confidence score', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'What is the hotel cap?', null, caller);
      expect(result.answer.confidence).toBeGreaterThan(0);
    });
  });

  describe('Retrieval from knowledge base', () => {
    it('should use enterprise-scoped knowledge base', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'business class rules', null, caller);
      expect(result.answer.citations[0].policy_version).toBe('v5');
      expect(result.answer.citations[0].page_number).toBe(14);
    });
  });

  describe('Citation generation', () => {
    it('should include policy version in citations', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'flight rules', null, caller);
      expect(result.answer.citations[0].policy_version).toBe('v5');
    });

    it('should include page number in citations', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'flight rules', null, caller);
      expect(result.answer.citations[0].page_number).toBe(14);
    });

    it('should include section reference in citations', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'flight rules', null, caller);
      expect(result.answer.citations[0].section_reference).toBe('3.2');
    });
  });

  describe('No-answer scenario (hallucination prevention)', () => {
    it('should refuse to answer when no context available', async () => {
      // No chunks for other enterprise
      const result = await service.askQuestion(otherEnterpriseId, tenantId, 'unknown question', null, caller);
      expect(result.answer.answer).toContain('could not find information');
      expect(result.answer.confidence).toBe(0);
      expect(result.answer.citations).toHaveLength(0);
    });
  });

  describe('Conversation creation', () => {
    it('should create a new conversation', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'hello', null, caller);
      expect(result.conversation_id).toBeDefined();
      const convs = await service.getConversations(enterpriseId, tenantId, caller);
      expect(convs).toHaveLength(1);
    });

    it('should reuse existing conversation', async () => {
      const r1 = await service.askQuestion(enterpriseId, tenantId, 'first', null, caller);
      const r2 = await service.askQuestion(enterpriseId, tenantId, 'second', r1.conversation_id, caller);
      expect(r2.conversation_id).toBe(r1.conversation_id);
    });
  });

  describe('Conversation history retrieval', () => {
    it('should store and retrieve messages', async () => {
      const r = await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      const { messages } = await service.getConversation(r.conversation_id, tenantId, caller);
      expect(messages).toHaveLength(2); // User + Assistant
      expect(messages[0].role).toBe('User');
      expect(messages[1].role).toBe('Assistant');
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant questions', async () => {
      await expect(
        service.askQuestion(enterpriseId, tenantId, 'test', null, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant conversation access', async () => {
      const r = await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      await expect(
        service.getConversation(r.conversation_id, tenantId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('Enterprise isolation', () => {
    it('should not return chunks from another enterprise', async () => {
      const result = await service.askQuestion(otherEnterpriseId, tenantId, 'business class', null, caller);
      // No chunks configured for otherEnterpriseId
      expect(result.answer.answer).toContain('could not find information');
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to ask questions for any tenant', async () => {
      const result = await service.askQuestion(enterpriseId, tenantId, 'business class', null, systemAdmin);
      expect(result.answer.answer).toContain('Business class');
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyQuestionAsked', async () => {
      await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      expect(eventBus.getEventsByType('PolicyQuestionAsked')).toHaveLength(1);
    });

    it('should emit PolicyAnswerGenerated', async () => {
      await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      expect(eventBus.getEventsByType('PolicyAnswerGenerated')).toHaveLength(1);
    });
  });

  describe('Audit logging', () => {
    it('should audit question submission', async () => {
      const r = await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      const audits = await auditRepo.findByEntity('PolicyAssistant', r.conversation_id);
      expect(audits.some((a) => a.action === 'QuestionSubmitted')).toBe(true);
    });

    it('should audit answer generation', async () => {
      const r = await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      const audits = await auditRepo.findByEntity('PolicyAssistant', r.conversation_id);
      expect(audits.some((a) => a.action === 'AnswerGenerated')).toBe(true);
    });

    it('should audit conversation viewed', async () => {
      const r = await service.askQuestion(enterpriseId, tenantId, 'test', null, caller);
      await service.getConversation(r.conversation_id, tenantId, caller);
      const audits = await auditRepo.findByEntity('PolicyAssistant', r.conversation_id);
      expect(audits.some((a) => a.action === 'ConversationViewed')).toBe(true);
    });
  });
});
