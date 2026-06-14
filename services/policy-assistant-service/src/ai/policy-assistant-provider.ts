import { AssistantInput, AssistantAnswer } from '../domain/types';

/**
 * Policy Assistant AI Provider (Bedrock Claude Sonnet, temperature 0.1).
 */
export interface PolicyAssistantProvider {
  answerQuestion(input: AssistantInput): Promise<AssistantAnswer>;
}
