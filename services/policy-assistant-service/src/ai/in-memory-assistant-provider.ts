import { PolicyAssistantProvider } from './policy-assistant-provider';
import { AssistantInput, AssistantAnswer, Citation } from '../domain/types';

/**
 * In-memory assistant provider for testing.
 * Generates answers from retrieved context (no hallucination).
 */
export class InMemoryPolicyAssistantProvider implements PolicyAssistantProvider {
  private customAnswers = new Map<string, AssistantAnswer>();

  setAnswer(question: string, answer: AssistantAnswer): void {
    this.customAnswers.set(question.toLowerCase(), answer);
  }

  async answerQuestion(input: AssistantInput): Promise<AssistantAnswer> {
    // Check for pre-configured answer
    const custom = this.customAnswers.get(input.question.toLowerCase());
    if (custom) return { ...custom };

    // If no context retrieved, refuse to answer (hallucination prevention)
    if (input.retrieved_context.length === 0) {
      return {
        answer: 'I could not find information supporting that question in the current policy.',
        confidence: 0,
        citations: [],
      };
    }

    // Generate answer from retrieved context
    const topChunk = input.retrieved_context[0];
    const citations: Citation[] = input.retrieved_context.slice(0, 3).map((c) => ({
      policy_version: c.policy_version,
      page_number: c.page_number,
      section_reference: c.section_reference,
      source_type: c.source_type,
      source_text: c.text.substring(0, 200),
    }));

    return {
      answer: `Based on the policy: ${topChunk.text.substring(0, 150)}`,
      confidence: topChunk.score,
      citations,
    };
  }

  clear(): void {
    this.customAnswers.clear();
  }
}
