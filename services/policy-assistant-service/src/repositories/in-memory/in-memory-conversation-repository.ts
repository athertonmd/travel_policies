import { ConversationRepository } from '../conversation-repository';
import { PolicyConversation, PolicyMessage } from '../../domain/types';

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations: PolicyConversation[] = [];
  private messages: PolicyMessage[] = [];

  async createConversation(conv: PolicyConversation): Promise<PolicyConversation> {
    this.conversations.push({ ...conv });
    return { ...conv };
  }

  async findConversation(conversationId: string): Promise<PolicyConversation | null> {
    const found = this.conversations.find((c) => c.conversation_id === conversationId);
    return found ? { ...found } : null;
  }

  async findByEnterprise(enterpriseId: string): Promise<PolicyConversation[]> {
    return this.conversations.filter((c) => c.enterprise_id === enterpriseId).map((c) => ({ ...c }));
  }

  async addMessage(message: PolicyMessage): Promise<PolicyMessage> {
    this.messages.push({ ...message });
    return { ...message };
  }

  async getMessages(conversationId: string): Promise<PolicyMessage[]> {
    return this.messages.filter((m) => m.conversation_id === conversationId).map((m) => ({ ...m }));
  }

  clear(): void { this.conversations = []; this.messages = []; }
}
