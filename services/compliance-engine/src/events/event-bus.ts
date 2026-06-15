import { BaseEvent } from '@tpip/event-contracts';
export interface EventBus { publish(event: BaseEvent): Promise<void>; }
export class InMemoryEventBus implements EventBus {
  private events: BaseEvent[] = [];
  async publish(event: BaseEvent): Promise<void> { this.events.push(event); }
  getEventsByType(type: string): BaseEvent[] { return this.events.filter((e) => e.event_type === type); }
  clear(): void { this.events = []; }
}
