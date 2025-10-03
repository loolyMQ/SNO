import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface Event {
  id: string;
  type: string;
  data: unknown;
  metadata: Record<string, unknown>;
  timestamp: Date;
  source: string;
}

export interface EventHandler<T = unknown> {
  (_event: Event & { data: T }): Promise<void>;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
}

@injectable()
export class EventService {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize: number;

  constructor(
    private readonly _logger: LoggerService,
    private readonly _metrics: MetricsService
  ) {
    this.maxHistorySize = parseInt(process.env.EVENT_HISTORY_SIZE || '1000');
    this._logger.info('EventService initialized');
  }

  public async publish<T>(eventType: string, data: T, metadata: Record<string, unknown> = {}): Promise<void> {
    const event: Event = {
      id: this.generateEventId(),
      type: eventType,
      data,
      metadata,
      timestamp: new Date(),
      source: process.env.SERVICE_NAME || 'unknown'
    };

    this.addToHistory(event);
    this._metrics.incrementCounter('events_published_total', { type: eventType });

    const handlers = this.subscriptions.get(eventType) || [];
    
    if (handlers.length === 0) {
      this._logger.warn(`No handlers registered for event type: ${eventType}`);
      return;
    }

    const sortedHandlers = handlers.sort((a, b) => b.priority - a.priority);
    
    for (const subscription of sortedHandlers) {
      try {
        await subscription.handler(event as Event & { data: T });
        this._metrics.incrementCounter('event_handlers_success_total', { 
          type: eventType,
          handler: subscription.id 
        });
      } catch (error) {
        this._logger.error(`Event handler failed for ${eventType}`, {
          error: (error as Error).message,
          handler: subscription.id,
          eventId: event.id
        });
        this._metrics.incrementCounter('event_handlers_error_total', { 
          type: eventType,
          handler: subscription.id 
        });
      }
    }
  }

  public subscribe<T>(
    eventType: string,
    handler: EventHandler<T>,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      priority
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);
    this._metrics.incrementCounter('event_subscriptions_total', { type: eventType });

    this._logger.debug(`Event subscription created`, {
      subscriptionId,
      eventType,
      priority
    });

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, handlers] of this.subscriptions) {
      const index = handlers.findIndex(h => h.id === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
        this._metrics.incrementCounter('event_unsubscriptions_total', { type: eventType });
        
        this._logger.debug(`Event subscription removed`, {
          subscriptionId,
          eventType
        });
        
        return true;
      }
    }
    
    return false;
  }

  public getEventHistory(eventType?: string): Event[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  public getSubscriptions(eventType?: string): EventSubscription[] {
    if (eventType) {
      return this.subscriptions.get(eventType) || [];
    }
    
    const allSubscriptions: EventSubscription[] = [];
    for (const handlers of this.subscriptions.values()) {
      allSubscriptions.push(...handlers);
    }
    return allSubscriptions;
  }

  public clearHistory(): void {
    this.eventHistory = [];
    this._logger.info('Event history cleared');
  }

  public getStats(): {
    totalEvents: number;
    subscriptionsByType: Record<string, number>;
    eventTypes: string[];
  } {
    const subscriptionsByType: Record<string, number> = {};
    const eventTypes: string[] = [];

    for (const [eventType, handlers] of this.subscriptions) {
      subscriptionsByType[eventType] = handlers.length;
      eventTypes.push(eventType);
    }

    return {
      totalEvents: this.eventHistory.length,
      subscriptionsByType,
      eventTypes
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private addToHistory(event: Event): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}
