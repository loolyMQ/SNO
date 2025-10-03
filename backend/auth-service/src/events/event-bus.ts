import { EventEmitter } from 'events';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface EventHandler<T = Record<string, unknown>> {
  handle(event: T): Promise<void>;
}

export class EventBus extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  register<T = Record<string, unknown>>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    // Publishing event
    logger.debug({
      eventType: event.type,
      eventId: event.id,
      action: 'publishing-event'
    }, 'Publishing event');
    
    // Emit to internal listeners
    this.emit(event.type, event);
    
    // Handle registered handlers
    const handlers = this.handlers.get(event.type) || [];
    const promises = handlers.map(handler => 
      this.handleEvent(handler, event)
    );
    
    await Promise.allSettled(promises);
  }

  private async handleEvent(handler: EventHandler, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      // Error handling event - could implement retry logic or dead letter queue here
      logger.error({
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
        action: 'event-handler-error'
      }, 'Error handling event');
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }
}

// Event factory
export class EventFactory {
  static createEvent(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): DomainEvent {
    return {
      id: this.generateId(),
      type,
      aggregateId,
      aggregateType,
      version: 1,
      timestamp: new Date(),
      data,
      metadata: metadata || {},
    };
  }

  public static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Auth-specific events
export class UserRegisteredEvent implements DomainEvent {
  id: string;
  type = 'UserRegistered';
  aggregateId: string;
  aggregateType = 'User';
  version = 1;
  timestamp: Date;
  data: {
    userId: string;
    email: string;
    role: string;
  };

  constructor(userId: string, email: string, role: string) {
    this.id = EventFactory.generateId();
    this.aggregateId = userId;
    this.timestamp = new Date();
    this.data = { userId, email, role };
  }
}

export class UserLoggedInEvent implements DomainEvent {
  id: string;
  type = 'UserLoggedIn';
  aggregateId: string;
  aggregateType = 'User';
  version = 1;
  timestamp: Date;
  data: {
    userId: string;
    email: string;
    loginTime: Date;
  };

  constructor(userId: string, email: string) {
    this.id = EventFactory.generateId();
    this.aggregateId = userId;
    this.timestamp = new Date();
    this.data = { userId, email, loginTime: new Date() };
  }
}

export class UserRoleUpdatedEvent implements DomainEvent {
  id: string;
  type = 'UserRoleUpdated';
  aggregateId: string;
  aggregateType = 'User';
  version = 1;
  timestamp: Date;
  data: {
    userId: string;
    oldRole: string;
    newRole: string;
  };

  constructor(userId: string, oldRole: string, newRole: string) {
    this.id = EventFactory.generateId();
    this.aggregateId = userId;
    this.timestamp = new Date();
    this.data = { userId, oldRole, newRole };
  }
}

// Global event bus instance
