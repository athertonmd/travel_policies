import { PolicyAIProvider } from './policy-ai-provider';
import {
  PolicyExtractionInput,
  PolicyExtractionOutput,
  ExtractedRuleOutput,
  StructuredPolicyOutput,
} from '../domain/ai-types';
import { ExtractionError } from '../domain/errors';

/**
 * In-memory Policy AI Provider for testing.
 * Simulates Amazon Bedrock Claude Sonnet without AWS dependencies.
 */
export class InMemoryPolicyAIProvider implements PolicyAIProvider {
  private results = new Map<string, PolicyExtractionOutput>();
  private failures = new Set<string>();
  private invalidJsonDocuments = new Set<string>();

  /** Configure a successful extraction for a document */
  setResult(documentId: string, output: PolicyExtractionOutput): void {
    this.results.set(documentId, output);
  }

  /** Configure a failure for a document */
  setFailure(documentId: string): void {
    this.failures.add(documentId);
  }

  /** Configure an invalid JSON response for a document */
  setInvalidJson(documentId: string): void {
    this.invalidJsonDocuments.add(documentId);
  }

  async extractPolicy(input: PolicyExtractionInput): Promise<PolicyExtractionOutput> {
    if (this.failures.has(input.document_id)) {
      throw new ExtractionError('AI extraction failed: Bedrock service unavailable');
    }

    if (this.invalidJsonDocuments.has(input.document_id)) {
      throw new ExtractionError('AI extraction failed: Invalid JSON response from model');
    }

    const result = this.results.get(input.document_id);
    if (result) {
      return { ...result };
    }

    // Default: generate a simple extraction based on input
    const now = new Date().toISOString();
    const rules: ExtractedRuleOutput[] = [];
    const structuredPolicy: StructuredPolicyOutput = {
      enterpriseId: input.enterprise_id,
      policyVersion: `v${input.policy_version}`,
      effectiveDate: null,
      air: {},
      hotel: {},
      rail: {},
      car: {},
      general: {},
    };

    return {
      structured_policy_json: structuredPolicy,
      extracted_rules: rules,
      overall_confidence: 0,
      model_name: 'claude-sonnet-mock',
      extraction_timestamp: now,
    };
  }

  clear(): void {
    this.results.clear();
    this.failures.clear();
    this.invalidJsonDocuments.clear();
  }
}
