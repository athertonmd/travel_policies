import { PolicyConversation, PolicyMessage } from '../domain/types';

export interface ConversationRepository {
  createConversation(conv: PolicyConversation): Promise<PolicyConversation>;
  findConversation(conversationId: string): Promise<PolicyConversation | null>;
  findByEnterprise(enterpriseId: string): Promise<PolicyConversation[]>;
  addMessage(message: PolicyMessage): Promise<PolicyMessage>;
  getMessages(conversationId: string): Promise<PolicyMessage[]>;
}
