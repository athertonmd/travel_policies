import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyExtractionService } from '../services/policy-extraction-service';
import { InMemoryExtractedTextRepository } from '../repositories/in-memory/in-memory-extracted-text-repository';
import { InMemoryDocumentLookup } from '../repositories/in-memory/in-memory-document-lookup';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryExtractedPolicyRepository, InMemoryPolicyRuleRepository } from '../repositories/in-memory/in-memory-policy-repository';
import { InMemoryPolicyAIProvider } from '../ai/in-memory-policy-ai-provider';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, DocumentRef, ExtractedDocumentText } from '../domain/types';
import { PolicyExtractionOutput, getConfidenceBand, isValidRuleType, RULE_TAXONOMY } from '../domain/ai-types';

describe('PolicyExtractionService', () => {
  let extractedTextRepo: InMemoryExtractedTextRepository;
  let documentLookup: InMemoryDocumentLookup;
  let auditRepo: InMemoryAuditRepository;
  let policyRepo: InMemoryExtractedPolicyRepository;
  let ruleRepo: InMemoryPolicyRuleRepository;
  let aiProvider: InMemoryPolicyAIProvider;
  let eventBus: InMemoryEventBus;
  let service: PolicyExtractionService;

  const tenantId = '550e8400-e29b-41d4-a716-446655440001';
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440010';
  const documentId = '550e8400-e29b-41d4-a716-446655440020';
  const otherTenantId = '550e8400-e29b-41d4-a716-446655440099';

  const tmcAdmin: CallerContext = {
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

  const document: DocumentRef = {
    document_id: documentId,
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    filename: 'travel-policy.pdf',
    content_type: 'application/pdf',
    storage_location: `s3://policy-documents/${tenantId}/${enterpriseId}/v1/travel-policy.pdf`,
    status: 'TextExtracted',
  };

  const samplePages: ExtractedDocumentText[] = [
    {
      extracted_text_id: '550e8400-e29b-41d4-a716-446655440060',
      document_id: documentId,
      tenant_id: tenantId,
      page_number: 1,
      page_text: 'All flights must be booked at the lowest logical fare. Business class is permitted on flights exceeding 8 hours.',
      extraction_timestamp: '2024-01-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
    },
    {
      extracted_text_id: '550e8400-e29b-41d4-a716-446655440061',
      document_id: documentId,
      tenant_id: tenantId,
      page_number: 2,
      page_text: 'Hotel bookings must not exceed £200 per night. Preferred chain is Marriott.',
      extraction_timestamp: '2024-01-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  ];

  const successfulAIOutput: PolicyExtractionOutput = {
    structured_policy_json: {
      enterpriseId,
      policyVersion: 'v1',
      effectiveDate: '2024-01-01',
      air: { lowest_logical_fare: true, business_class_threshold_hours: 8 },
      hotel: { max_nightly_rate: 200, preferred_chains: ['Marriott'] },
      rail: {},
      car: {},
      general: {},
    },
    extracted_rules: [
      {
        rule_type: 'AIR_001',
        category: 'Air',
        value: 'Lowest logical fare required',
        confidence: 97,
        source_reference: {
          document_id: documentId,
          page_number: 1,
          paragraph_reference: '1.1',
          source_text: 'All flights must be booked at the lowest logical fare.',
          character_start: 0,
          character_end: 52,
        },
      },
      {
        rule_type: 'AIR_008',
        category: 'Air',
        value: '8 hours threshold for business class',
        confidence: 92,
        source_reference: {
          document_id: documentId,
          page_number: 1,
          paragraph_reference: '1.2',
          source_text: 'Business class is permitted on flights exceeding 8 hours.',
          character_start: 53,
          character_end: 110,
        },
      },
      {
        rule_type: 'HOTEL_001',
        category: 'Hotel',
        value: '£200 per night maximum',
        confidence: 95,
        source_reference: {
          document_id: documentId,
          page_number: 2,
          paragraph_reference: '2.1',
          source_text: 'Hotel bookings must not exceed £200 per night.',
          character_start: 0,
          character_end: 47,
        },
      },
      {
        rule_type: 'HOTEL_004',
        category: 'Hotel',
        value: 'Marriott',
        confidence: 72, // Low confidence — requires mandatory review
        source_reference: {
          document_id: documentId,
          page_number: 2,
          paragraph_reference: '2.2',
          source_text: 'Preferred chain is Marriott.',
          character_start: 48,
          character_end: 76,
        },
      },
    ],
    overall_confidence: 89,
    model_name: 'claude-sonnet-3.5',
    extraction_timestamp: '2024-01-01T12:00:00.000Z',
  };

  beforeEach(() => {
    extractedTextRepo = new InMemoryExtractedTextRepository();
    documentLookup = new InMemoryDocumentLookup();
    auditRepo = new InMemoryAuditRepository();
    policyRepo = new InMemoryExtractedPolicyRepository();
    ruleRepo = new InMemoryPolicyRuleRepository();
    aiProvider = new InMemoryPolicyAIProvider();
    eventBus = new InMemoryEventBus();
    service = new PolicyExtractionService(
      extractedTextRepo,
      documentLookup,
      policyRepo,
      ruleRepo,
      auditRepo,
      aiProvider,
      eventBus,
    );

    documentLookup.addDocument(document);
    extractedTextRepo.createBatch(samplePages);
    aiProvider.setResult(documentId, successfulAIOutput);
  });

  describe('Successful policy extraction', () => {
    it('should extract policy and create records', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      expect(result.policy).toBeDefined();
      expect(result.policy.policy_id).toBeDefined();
      expect(result.policy.overall_confidence).toBe(89);
      expect(result.rules).toHaveLength(4);
    });

    it('should update document status to Review', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('Review');
    });
  });

  describe('AI provider failure', () => {
    it('should handle AI provider failures', async () => {
      aiProvider.setFailure(documentId);
      await expect(
        service.extractPolicy(enterpriseId, documentId, tmcAdmin),
      ).rejects.toThrow('AI extraction failed');
    });

    it('should set status to ExtractionFailed on AI failure', async () => {
      aiProvider.setFailure(documentId);
      try { await service.extractPolicy(enterpriseId, documentId, tmcAdmin); } catch { /* expected */ }
      const doc = await documentLookup.findById(documentId);
      expect(doc?.status).toBe('ExtractionFailed');
    });
  });

  describe('Invalid AI JSON response', () => {
    it('should handle invalid JSON from AI', async () => {
      aiProvider.setInvalidJson(documentId);
      await expect(
        service.extractPolicy(enterpriseId, documentId, tmcAdmin),
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('Missing extracted text', () => {
    it('should fail when no extracted text exists', async () => {
      const emptyDocId = '550e8400-e29b-41d4-a716-446655440080';
      documentLookup.addDocument({
        ...document,
        document_id: emptyDocId,
        status: 'TextExtracted',
      });
      await expect(
        service.extractPolicy(enterpriseId, emptyDocId, tmcAdmin),
      ).rejects.toThrow('No extracted text available');
    });
  });

  describe('Empty extracted text', () => {
    it('should fail with no pages', async () => {
      const noTextDocId = '550e8400-e29b-41d4-a716-446655440081';
      documentLookup.addDocument({
        ...document,
        document_id: noTextDocId,
      });
      // No text added for this document
      await expect(
        service.extractPolicy(enterpriseId, noTextDocId, tmcAdmin),
      ).rejects.toThrow('No extracted text available');
    });
  });

  describe('Rule taxonomy validation', () => {
    it('should validate known rule types', () => {
      expect(isValidRuleType('AIR_001')).toBe(true);
      expect(isValidRuleType('HOTEL_013')).toBe(true);
      expect(isValidRuleType('RAIL_006')).toBe(true);
      expect(isValidRuleType('CAR_006')).toBe(true);
      expect(isValidRuleType('GEN_010')).toBe(true);
    });

    it('should reject unknown rule types', () => {
      expect(isValidRuleType('AIR_999')).toBe(false);
      expect(isValidRuleType('INVALID')).toBe(false);
      expect(isValidRuleType('')).toBe(false);
    });

    it('should have all required rule codes', () => {
      expect(RULE_TAXONOMY.Air).toHaveLength(15);
      expect(RULE_TAXONOMY.Hotel).toHaveLength(13);
      expect(RULE_TAXONOMY.Rail).toHaveLength(6);
      expect(RULE_TAXONOMY.Car).toHaveLength(6);
      expect(RULE_TAXONOMY.General).toHaveLength(10);
    });
  });

  describe('Confidence scoring', () => {
    it('should classify confidence bands correctly', () => {
      expect(getConfidenceBand(100)).toBe('High');
      expect(getConfidenceBand(95)).toBe('High');
      expect(getConfidenceBand(94)).toBe('Medium');
      expect(getConfidenceBand(80)).toBe('Medium');
      expect(getConfidenceBand(79)).toBe('Low');
      expect(getConfidenceBand(0)).toBe('Low');
    });

    it('should mark all rules as PendingReview', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      result.rules.forEach((rule) => {
        expect(rule.review_status).toBe('PendingReview');
      });
    });
  });

  describe('Low confidence rule marking', () => {
    it('should identify low confidence rules (below 80)', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const lowConfRules = result.rules.filter((r) => r.confidence < 80);
      expect(lowConfRules).toHaveLength(1);
      expect(lowConfRules[0].rule_type).toBe('HOTEL_004');
      expect(lowConfRules[0].confidence).toBe(72);
    });
  });

  describe('Source reference storage', () => {
    it('should store source references with page numbers', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const rule = result.rules[0];
      const sourceRef = JSON.parse(rule.source_reference);
      expect(sourceRef.document_id).toBe(documentId);
      expect(sourceRef.page_number).toBe(1);
      expect(sourceRef.paragraph_reference).toBe('1.1');
      expect(sourceRef.source_text).toContain('lowest logical fare');
      expect(sourceRef.character_start).toBe(0);
      expect(sourceRef.character_end).toBe(52);
    });
  });

  describe('PolicyRule creation', () => {
    it('should create rules with correct fields', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const rule = result.rules[0];
      expect(rule.rule_id).toBeDefined();
      expect(rule.policy_id).toBeDefined();
      expect(rule.rule_type).toBe('AIR_001');
      expect(rule.category).toBe('Air');
      expect(rule.value).toBe('Lowest logical fare required');
      expect(rule.confidence).toBe(97);
      expect(rule.ai_generated_value).toBe('Lowest logical fare required');
      expect(rule.reviewed_value).toBeNull();
      expect(rule.review_status).toBe('PendingReview');
    });
  });

  describe('ExtractedPolicy creation', () => {
    it('should create ExtractedPolicy with correct fields', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      expect(result.policy.document_id).toBe(documentId);
      expect(result.policy.enterprise_id).toBe(enterpriseId);
      expect(result.policy.tenant_id).toBe(tenantId);
      expect(result.policy.extraction_model).toBe('claude-sonnet-3.5');
      expect(result.policy.overall_confidence).toBe(89);
    });
  });

  describe('Raw AI output storage (BR-009)', () => {
    it('should store raw AI output', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      expect(result.policy.raw_ai_output).toBeDefined();
      const rawOutput = JSON.parse(result.policy.raw_ai_output);
      expect(rawOutput.model_name).toBe('claude-sonnet-3.5');
      expect(rawOutput.extracted_rules).toHaveLength(4);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant extraction', async () => {
      await expect(
        service.extractPolicy(enterpriseId, documentId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent cross-tenant policy viewing', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      await expect(
        service.getExtractedPolicy(enterpriseId, documentId, otherTenantCaller),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('SystemAdmin override', () => {
    it('should allow SystemAdmin to extract from any tenant', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, systemAdmin);
      expect(result.policy).toBeDefined();
    });

    it('should allow SystemAdmin to view any policy', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const policy = await service.getExtractedPolicy(enterpriseId, documentId, systemAdmin);
      expect(policy).toBeDefined();
    });
  });

  describe('Event emission', () => {
    it('should emit PolicyDocumentExtractionCompleted on success', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const events = eventBus.getEventsByType('PolicyDocumentExtractionCompleted');
      expect(events).toHaveLength(1);
    });

    it('should emit PolicyDocumentExtractionFailed on failure', async () => {
      aiProvider.setFailure(documentId);
      try { await service.extractPolicy(enterpriseId, documentId, tmcAdmin); } catch { /* expected */ }
      const events = eventBus.getEventsByType('PolicyDocumentExtractionFailed');
      expect(events).toHaveLength(1);
    });
  });

  describe('Audit logging', () => {
    it('should log AI extraction started', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'AIExtractionStarted')).toBe(true);
    });

    it('should log AI extraction completed', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'AIExtractionCompleted')).toBe(true);
    });

    it('should log AI extraction failed', async () => {
      aiProvider.setFailure(documentId);
      try { await service.extractPolicy(enterpriseId, documentId, tmcAdmin); } catch { /* expected */ }
      const audits = await auditRepo.findByEntity('PolicyDocument', documentId);
      expect(audits.some((a) => a.action === 'AIExtractionFailed')).toBe(true);
    });

    it('should log extracted policy viewed', async () => {
      await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      const policy = await service.getExtractedPolicy(enterpriseId, documentId, tmcAdmin);
      const audits = await auditRepo.findByEntity('ExtractedPolicy', policy.policy_id);
      expect(audits.some((a) => a.action === 'ExtractedPolicyViewed')).toBe(true);
    });

    it('should log policy rules viewed', async () => {
      const result = await service.extractPolicy(enterpriseId, documentId, tmcAdmin);
      await service.getPolicyRules(enterpriseId, result.policy.policy_id, tmcAdmin);
      const audits = await auditRepo.findByEntity('PolicyRule', result.policy.policy_id);
      expect(audits.some((a) => a.action === 'PolicyRulesViewed')).toBe(true);
    });
  });
});
