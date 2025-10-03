import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventBusService, DomainEvent } from '../events/event-bus.service';

export interface Command {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: unknown;
  metadata: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

export interface CommandHandler<TCommand extends Command = Command> {
  commandType: string;
  handle: (_command: TCommand) => Promise<void>;
}

export interface CommandResult {
  success: boolean;
  aggregateId: string;
  version: number;
  events: DomainEvent[];
  error?: string;
}

@injectable()
export class CommandService extends BaseService {
  private readonly handlers: Map<string, CommandHandler[]> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    private readonly _eventBus: EventBusService
  ) {
    super(logger, metrics);
  }

  async registerHandler(handler: CommandHandler): Promise<void> {
    await this.executeWithMetrics('command.register_handler', async () => {
      if (!this.handlers.has(handler.commandType)) {
        this.handlers.set(handler.commandType, []);
      }

      this.handlers.get(handler.commandType)!.push(handler);

      this.logger.info('Command handler registered', {
        commandType: handler.commandType
      });

      this.metrics.incrementCounter('command.handlers.registered', {
        commandType: handler.commandType
      });
    });
  }

  async execute<TCommand extends Command>(command: TCommand): Promise<CommandResult> {
    return await this.executeWithMetrics('command.execute', async () => {
      const handlers = this.handlers.get(command.type) || [];
      
      if (handlers.length === 0) {
        throw new Error(`No handlers found for command type: ${command.type}`);
      }

      const events: DomainEvent[] = [];
      let success = true;
      let error: string | undefined;

      try {
        // Execute all handlers for this command
        for (const handler of handlers) {
          await this.executeHandler(handler, command);
        }

        // Create domain events from the command
        const domainEvent = this.createDomainEventFromCommand(command);
        events.push(domainEvent);

        // Publish events
        await this.publishEvents(events);

        this.logger.info('Command executed successfully', {
          commandId: command.id,
          commandType: command.type,
          aggregateId: command.aggregateId,
          eventsCount: events.length
        });

        this.metrics.incrementCounter('command.executed.success', {
          commandType: command.type
        });

      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        
        this.logger.error('Command execution failed', {
          commandId: command.id,
          commandType: command.type,
          aggregateId: command.aggregateId,
          error
        });

        this.metrics.incrementCounter('command.executed.error', {
          commandType: command.type,
          error: err instanceof Error ? err.name : 'Unknown'
        });
      }

      return {
        success,
        aggregateId: command.aggregateId,
        version: 1,
        events,
        error: error ?? ''
      };
    });
  }

  private async executeHandler(handler: CommandHandler, command: Command): Promise<void> {
    try {
      await this.executeWithMetrics('command.handler.execute', async () => {
        await handler.handle(command);
      });

      this.logger.debug('Command handler executed successfully', {
        commandId: command.id,
        commandType: command.type,
        handlerCommandType: handler.commandType
      });

    } catch (error) {
      this.logger.error('Command handler failed', {
        commandId: command.id,
        commandType: command.type,
        handlerCommandType: handler.commandType,
        error
      });

      this.metrics.incrementCounter('command.handlers.error', {
        commandType: command.type,
        handlerCommandType: handler.commandType,
        error: error instanceof Error ? error.name : 'Unknown'
      });

      throw error;
    }
  }

  private createDomainEventFromCommand(command: Command): DomainEvent {
    return {
      id: this.generateEventId(),
      type: `${command.type}Executed`,
      aggregateId: command.aggregateId,
      aggregateType: command.aggregateType,
      version: 1,
      timestamp: new Date(),
      data: command.data,
      metadata: {
        ...command.metadata,
        commandId: command.id,
        userId: command.userId,
        correlationId: command.correlationId
      }
    };
  }

  private async publishEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this._eventBus.publish(event);
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  createCommand(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    userId?: string,
    correlationId?: string
  ): Command {
    return {
      id: this.generateCommandId(),
      type,
      aggregateId,
      aggregateType,
      data,
      metadata,
      timestamp: new Date(),
      userId: userId ?? '',
      correlationId: correlationId ?? ''
    };
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getRegisteredHandlers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [commandType, handlers] of this.handlers) {
      result[commandType] = handlers.length;
    }
    return result;
  }
}
