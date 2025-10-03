import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventBusService, DomainEvent } from '../events/event-bus.service';

export interface SagaStep {
  id: string;
  name: string;
  action: () => Promise<unknown>;
  compensation: () => Promise<unknown>;
  retryPolicy?: {
    maxRetries: number;
    delay: number;
    backoffMultiplier: number;
  };
}

export interface Saga {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  steps: SagaStep[];
  currentStepIndex: number;
  context: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SagaResult {
  success: boolean;
  sagaId: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  error?: string;
}

@injectable()
export class SagaService extends BaseService {
  private readonly sagas: Map<string, Saga> = new Map();
  private readonly stepResults: Map<string, unknown> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    private _eventBus: EventBusService
  ) {
    if (!logger) {
      throw new Error('LoggerService is required');
    }
    if (!metrics) {
      throw new Error('MetricsService is required');
    }
    if (!_eventBus) {
      throw new Error('EventBusService is required');
    }
    super(logger, metrics);
  }

  async createSaga(
    type: string,
    steps: Omit<SagaStep, 'id'>[],
    context: Record<string, unknown> = {}
  ): Promise<Saga> {
    return await this.executeWithMetrics('saga.create', async () => {
      const saga: Saga = {
        id: this.generateSagaId(),
        type,
        status: 'pending',
        steps: steps.map(step => ({
          ...step,
          id: this.generateStepId()
        })),
        currentStepIndex: 0,
        context,
        startedAt: new Date()
      };

      this.sagas.set(saga.id, saga);

      this.logger.info('Saga created', {
        sagaId: saga.id,
        sagaType: saga.type,
        stepsCount: saga.steps.length
      });

      this.metrics.incrementCounter('saga.created', {
        sagaType: saga.type
      });

      return saga;
    });
  }

  async executeSaga(sagaId: string): Promise<SagaResult> {
    return await this.executeWithMetrics('saga.execute', async () => {
      const saga = this.sagas.get(sagaId);
      if (!saga) {
        throw new Error(`Saga not found: ${sagaId}`);
      }

      if (saga.status !== 'pending') {
        throw new Error(`Saga is not in pending state: ${saga.status}`);
      }

      saga.status = 'running';

      try {
        // Execute all steps
        for (let i = 0; i < saga.steps.length; i++) {
          saga.currentStepIndex = i;
          const step = saga.steps[i];

          if (step) {
            await this.executeStep(saga, step);
          }
        }

        // All steps completed successfully
        saga.status = 'completed';
        saga.completedAt = new Date();

        // Publish completion event
        await this.publishSagaEvent(saga, 'SagaCompleted');

        this.logger.info('Saga completed successfully', {
          sagaId: saga.id,
          sagaType: saga.type,
          stepsCount: saga.steps.length
        });

        this.metrics.incrementCounter('saga.completed', {
          sagaType: saga.type
        });

        return {
          success: true,
          sagaId: saga.id,
          status: saga.status,
          completedSteps: saga.steps.length,
          totalSteps: saga.steps.length
        };

      } catch (error) {
        saga.status = 'failed';
        saga.error = error instanceof Error ? error.message : 'Unknown error';

        this.logger.error('Saga execution failed', {
          sagaId: saga.id,
          sagaType: saga.type,
          currentStep: saga.currentStepIndex,
          error: saga.error
        });

        this.metrics.incrementCounter('saga.failed', {
          sagaType: saga.type,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        // Start compensation
        await this.compensateSaga(saga);

        return {
          success: false,
          sagaId: saga.id,
          status: saga.status,
          completedSteps: saga.currentStepIndex,
          totalSteps: saga.steps.length,
          error: saga.error
        };
      }
    });
  }

  private async executeStep(saga: Saga, step: SagaStep): Promise<void> {
    await this.executeWithMetrics('saga.step.execute', async () => {
      const retryPolicy = step.retryPolicy || {
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2
      };

      let lastError: Error | undefined;
      let delay = retryPolicy.delay;

      for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt++) {
        try {
          const result = await step.action();
          this.stepResults.set(step.id, result);
          saga.context[step.name] = result;

          this.logger.debug('Saga step executed successfully', {
            sagaId: saga.id,
            stepId: step.id,
            stepName: step.name,
            attempt
          });

          this.metrics.incrementCounter('saga.step.success', {
            sagaType: saga.type,
            stepName: step.name
          });

          return;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');

          if (attempt === retryPolicy.maxRetries) {
            this.logger.error('Saga step failed after all retries', {
              sagaId: saga.id,
              stepId: step.id,
              stepName: step.name,
              attempts: retryPolicy.maxRetries,
              error: lastError.message
            });

            this.metrics.incrementCounter('saga.step.failed', {
              sagaType: saga.type,
              stepName: step.name,
              error: lastError.name
            });

            throw lastError;
          }

          this.logger.warn('Saga step failed, retrying', {
            sagaId: saga.id,
            stepId: step.id,
            stepName: step.name,
            attempt,
            maxRetries: retryPolicy.maxRetries,
            delay,
            error: lastError.message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= retryPolicy.backoffMultiplier;
        }
      }

      throw lastError || new Error('Saga step failed with unknown error');
    });
  }

  private async compensateSaga(saga: Saga): Promise<void> {
    await this.executeWithMetrics('saga.compensate', async () => {
      saga.status = 'compensating';

      this.logger.info('Starting saga compensation', {
        sagaId: saga.id,
        sagaType: saga.type,
        currentStep: saga.currentStepIndex
      });

      // Compensate steps in reverse order
      for (let i = saga.currentStepIndex; i >= 0; i--) {
        const step = saga.steps[i];
        if (step) {
          const stepResult = this.stepResults.get(step.id);

          if (stepResult) {
          try {
            await step.compensation();
            this.logger.debug('Saga step compensated successfully', {
              sagaId: saga.id,
              stepId: step.id,
              stepName: step.name
            });

            this.metrics.incrementCounter('saga.step.compensated', {
              sagaType: saga.type,
              stepName: step.name
            });

          } catch (error) {
            this.logger.error('Saga step compensation failed', {
              sagaId: saga.id,
              stepId: step.id,
              stepName: step.name,
              error
            });

            this.metrics.incrementCounter('saga.step.compensation_failed', {
              sagaType: saga.type,
              stepName: step.name,
              error: error instanceof Error ? error.name : 'Unknown'
            });
          }
        }
        }
      }

      saga.status = 'compensated';
      saga.completedAt = new Date();

      // Publish compensation event
      await this.publishSagaEvent(saga, 'SagaCompensated');

      this.logger.info('Saga compensation completed', {
        sagaId: saga.id,
        sagaType: saga.type
      });

      this.metrics.incrementCounter('saga.compensated', {
        sagaType: saga.type
      });
    });
  }

  private async publishSagaEvent(saga: Saga, eventType: string): Promise<void> {
    const event: DomainEvent = {
      id: this.generateEventId(),
      type: eventType,
      aggregateId: saga.id,
      aggregateType: 'Saga',
      version: 1,
      timestamp: new Date(),
      data: {
        sagaId: saga.id,
        sagaType: saga.type,
        status: saga.status,
        stepsCount: saga.steps.length,
        completedSteps: saga.currentStepIndex + 1,
        context: saga.context
      },
      metadata: {
        sagaId: saga.id,
        sagaType: saga.type
      }
    };

    await this._eventBus.publish(event);
  }

  getSaga(sagaId: string): Saga | undefined {
    return this.sagas.get(sagaId);
  }

  getAllSagas(): Saga[] {
    return Array.from(this.sagas.values());
  }

  getSagasByType(type: string): Saga[] {
    return Array.from(this.sagas.values()).filter(saga => saga.type === type);
  }

  getSagasByStatus(status: Saga['status']): Saga[] {
    return Array.from(this.sagas.values()).filter(saga => saga.status === status);
  }

  private generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
