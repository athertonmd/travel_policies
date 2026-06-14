import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBaseService } from '../services/knowledge-base-service';
import { chunkText } from '../chunking/chunker';
import { InMemoryEmbeddingProvider } from '../embedding/in-memory-embedding-provider';
import { InMemoryVectorStore } from '../vector-store/in-memory-vector-store';
import { InMemoryEventBus } from '../events/event-bus';
import { InMemoryAuditRepository } from '../repositories/in-memory-audit-repository';
import { InMemoryCorrectionStore } from '../repositories/in-memory-correction-store';
import { CallerContext } from '../domain/types';

describe('KnowledgeBaseService', () => {
  let embeddingProvider: InMemoryEmbeddingProvider;
  let vectorStore: InMemoryVectorStore;
  let correctionStore: InMemoryCorrectionStore;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let service: KnowledgeBaseService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const otherEnterpriseId = '550e8400-e29b-41d4-a716-446655440011';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const caller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440030',
    tenant_id: tenantId,
    role: 'TMCAdmin',
  };

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440040',
    tenant_id: 'admin-tenant',
    role: 'SystemAdmin',
  };

  const otherTenantCaller: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440050',
    tenant_id: otherTenantId,
    role: 'TMCAdmin',
  };

  const sampleDocumentText = 'All flights must be booked at the lowest logical fare. Business class is only permitted on international flights exceeding eight hours in duration. Premium economy may be used on flights exceeding four hours. Domestic flights must always be economy class regardless of duration.';

  beforeEach(() => {
    embeddingProvider = new InMemoryEmbeddingProvider();
    vectorStore = new InMemoryVectorStore();
    correctionStore = new InMemoryCorrectionStore();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    service = new KnowledgeBaseService(embeddingProvider, vectorStore, correctionStore, auditRepo, eventBus);
  });

  describe('Chunking document text', () => {
    it('should chunk text into appropriately sized pieces', () => {
      const longText = 'A'.repeat(3000);
      const chunks = chunkText(longText, {
        enterprise_id: enterpriseId,
        tenant_id: tenantId,
        document_id: 'doc1',
        policy_id: null,
        policy_version: 1,
        page_number: 1,
        section_reference: null,
        source_type: 'DocumentText',
      });
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((c) => {
        expect(c.chunk_text.length).toBeGreaterThan(0);
        expect(c.chunk_text.length).toBeLessThanOrEqual(1500);
      });
    });

    it('should return empty array for empty text', () => {
      const chunks = chunkText('', {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_id: null, policy_version: 1,
        page_number: 1, section_reference: null, source_type: 'DocumentText',
      });
      expect(chunks).toHaveLength(0);
    });
  });

  describe('Chunking approved policy JSON', () => {
    it('should chunk policy JSON and set source type', () => {
      const policyJson = JSON.stringify({ air: { AIR_001: 'Lowest fare' }, hotel: { HOTEL_001: '£200' } });
      const chunks = chunkText(policyJson, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: null, policy_id: 'pol1', policy_version: 2,
        page_number: null, section_reference: null, source_type: 'ApprovedPolicy',
      });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].source_type).toBe('ApprovedPolicy');
    });
  });

  describe('Chunking reviewer corrections', () => {
    it('should chunk correction text', () => {
      const chunks = chunkText(
        'Rule: AIR_008. AI value: 6 hours. Reviewer value: 8 hours. Reason: Original policy states 8 hours.',
        { enterprise_id: enterpriseId, tenant_id: tenantId, document_id: null, policy_id: 'pol1', policy_version: 1, page_number: null, section_reference: null, source_type: 'ReviewerCorrection' },
      );
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].source_type).toBe('ReviewerCorrection');
    });
  });

  describe('Chunking policy changes', () => {
    it('should chunk change text', () => {
      const chunks = chunkText(
        'Change: AIR_008. Type: Modified. Old: 8 hours. New: 6 hours.',
        { enterprise_id: enterpriseId, tenant_id: tenantId, document_id: null, policy_id: 'pol1', policy_version: 2, page_number: null, section_reference: null, source_type: 'PolicyChange' },
      );
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].source_type).toBe('PolicyChange');
    });
  });

  describe('Creating embeddings', () => {
    it('should create embeddings via provider', async () => {
      const result = await embeddingProvider.createEmbedding({
        text: 'test text', enterprise_id: enterpriseId, policy_version: 1,
      });
      expect(result.embedding).toHaveLength(128);
      expect(result.model_name).toBe('bedrock-embedding-mock');
    });
  });

  describe('Upserting chunks', () => {
    it('should index document text into vector store', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);
      expect(vectorStore.getEntryCount()).toBeGreaterThan(0);
    });
  });

  describe('Enterprise-scoped search (BR-035)', () => {
    it('should return results scoped to enterprise', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);

      const response = await service.search(enterpriseId, tenantId, 'business class', caller);
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.enterpriseId).toBe(enterpriseId);
    });

    it('should return empty results for query in different enterprise', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);

      const response = await service.search(otherEnterpriseId, tenantId, 'business class', caller);
      expect(response.results).toHaveLength(0);
    });
  });

  describe('Preventing cross-enterprise results (ADR-015)', () => {
    it('should never return chunks from another enterprise', async () => {
      await service.indexDocumentText('Secret enterprise A content', {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);

      // Search as same tenant but different enterprise
      const response = await service.search(otherEnterpriseId, tenantId, 'secret', caller);
      expect(response.results).toHaveLength(0);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant indexing', async () => {
      await expect(
        service.indexDocumentText('text', {
          enterprise_id: enterpriseId, tenant_id: tenantId,
          document_id: 'doc1', policy_version: 1, page_number: 1,
        }, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant search', async () => {
      await expect(
        service.search(enterpriseId, tenantId, 'query', otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to index for any tenant', async () => {
      const chunks = await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, systemAdmin);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should allow SystemAdmin to search any tenant', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, systemAdmin);

      const response = await service.search(enterpriseId, tenantId, 'flights', systemAdmin);
      expect(response.results.length).toBeGreaterThan(0);
    });
  });

  describe('Correction context retrieval (BR-036)', () => {
    it('should return corrections for a specific rule type', async () => {
      correctionStore.addCorrection(enterpriseId, {
        rule_type: 'AIR_008', ai_value: '6 hours', reviewer_value: '8 hours',
        reason: 'Original policy says 8 hours', policy_version: 1, timestamp: '2024-01-01T00:00:00Z',
      });
      correctionStore.addCorrection(enterpriseId, {
        rule_type: 'AIR_001', ai_value: 'Cheapest', reviewer_value: 'Lowest logical',
        reason: 'Terminology correction', policy_version: 1, timestamp: '2024-01-01T00:00:00Z',
      });

      const corrections = await service.getCorrectionContext(enterpriseId, 'AIR_008', tenantId, caller);
      expect(corrections).toHaveLength(1);
      expect(corrections[0].reviewer_value).toBe('8 hours');
    });

    it('should return empty for no corrections', async () => {
      const corrections = await service.getCorrectionContext(enterpriseId, 'RAIL_001', tenantId, caller);
      expect(corrections).toHaveLength(0);
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyIndexed on document text indexing', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);
      expect(eventBus.getEventsByType('PolicyIndexed')).toHaveLength(1);
    });

    it('should emit PolicyEmbeddingCreated on correction indexing', async () => {
      await service.indexCorrections(
        [{ rule_type: 'AIR_001', ai_value: 'A', reviewer_value: 'B', reason: 'R' }],
        { enterprise_id: enterpriseId, tenant_id: tenantId, policy_id: 'pol1', policy_version: 1 },
        caller,
      );
      expect(eventBus.getEventsByType('PolicyEmbeddingCreated')).toHaveLength(1);
    });

    it('should emit KnowledgeSearchPerformed on search', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);
      await service.search(enterpriseId, tenantId, 'test', caller);
      expect(eventBus.getEventsByType('KnowledgeSearchPerformed')).toHaveLength(1);
    });
  });

  describe('Audit logging', () => {
    it('should audit policy indexing', async () => {
      await service.indexDocumentText(sampleDocumentText, {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);
      const audits = await auditRepo.findByEntity('KnowledgeBase', 'doc1');
      expect(audits.some((a) => a.action === 'PolicyIndexed')).toBe(true);
    });

    it('should audit correction indexing', async () => {
      await service.indexCorrections(
        [{ rule_type: 'AIR_001', ai_value: 'A', reviewer_value: 'B', reason: 'R' }],
        { enterprise_id: enterpriseId, tenant_id: tenantId, policy_id: 'pol1', policy_version: 1 },
        caller,
      );
      const audits = await auditRepo.findByEntity('KnowledgeBase', 'pol1');
      expect(audits.some((a) => a.action === 'CorrectionIndexed')).toBe(true);
    });

    it('should audit search', async () => {
      await service.indexDocumentText('text', {
        enterprise_id: enterpriseId, tenant_id: tenantId,
        document_id: 'doc1', policy_version: 1, page_number: 1,
      }, caller);
      await service.search(enterpriseId, tenantId, 'query', caller);
      const audits = await auditRepo.findByEntity('KnowledgeBase', enterpriseId);
      expect(audits.some((a) => a.action === 'KnowledgeSearchPerformed')).toBe(true);
    });

    it('should audit correction context retrieval', async () => {
      await service.getCorrectionContext(enterpriseId, 'AIR_001', tenantId, caller);
      const audits = await auditRepo.findByEntity('KnowledgeBase', `${enterpriseId}/AIR_001`);
      expect(audits.some((a) => a.action === 'CorrectionContextRetrieved')).toBe(true);
    });
  });

  describe('Empty search results', () => {
    it('should return empty results for unindexed enterprise', async () => {
      const response = await service.search(enterpriseId, tenantId, 'anything', caller);
      expect(response.results).toHaveLength(0);
    });
  });

  describe('Embedding provider failure', () => {
    it('should propagate embedding errors', async () => {
      embeddingProvider.setFailure(enterpriseId);
      await expect(
        service.indexDocumentText('text', {
          enterprise_id: enterpriseId, tenant_id: tenantId,
          document_id: 'doc1', policy_version: 1, page_number: 1,
        }, caller),
      ).rejects.toThrow('Embedding generation failed');
    });
  });

  describe('Vector store failure', () => {
    it('should propagate vector store errors', async () => {
      vectorStore.setFailure(true);
      await expect(
        service.indexDocumentText('text', {
          enterprise_id: enterpriseId, tenant_id: tenantId,
          document_id: 'doc1', policy_version: 1, page_number: 1,
        }, caller),
      ).rejects.toThrow('Vector store unavailable');
    });
  });
});
