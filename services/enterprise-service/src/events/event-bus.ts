import { BaseEvent } from '@tpip/event-contracts';

/**
 * Event bus interface for publishing domain events (ADR-014).
 */
export interface EventBus {
  publish(event: BaseEvent): Promise<void>;
}

/**
 * In-memory event bus for testing.
 */
export class InMemoryEventBus implements EventBus {
  private events: BaseEvent[] = [];

  async publish(event: BaseEvent): Promise<void> {
    this.events.push(event);
  }

  /** Get all published events */
  getPublishedEvents(): BaseEvent[] {
    return [...this.events];
  }

  /** Get events by type */
  getEventsByType(type: string): BaseEvent[] {
    return this.events.filter((e) => e.event_type === type);
  }

  /** Clear published events */
  clear(): void {
    this.events = [];
  }
}
