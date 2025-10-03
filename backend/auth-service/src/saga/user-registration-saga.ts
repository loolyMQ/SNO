import { z } from 'zod';
import bcrypt from 'bcrypt';

export interface SagaStep {
  id: string;
  action: () => Promise<unknown>;
  compensation: () => Promise<unknown>;
  retryCount: number;
  maxRetries: number;
}

export interface SagaContext {
  userId?: string;
  email?: string;
  passwordHash?: string;
  token?: string;
  error?: string;
}

export class UserRegistrationSaga {
  private steps: SagaStep[] = [];
  private context: SagaContext = {};
  private completedSteps: string[] = [];

  constructor() {
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'validate-input',
        action: async () => {
          // Validate input data
          const schema = z.object({
            email: z.string().email(),
            password: z.string().min(8),
          });
          
          const result = schema.safeParse(this.context);
          if (!result.success) {
            throw new Error('Invalid input data');
          }
        },
        compensation: async () => {
          // No compensation needed for validation
        },
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'check-user-exists',
        action: async () => {
          // Check if user already exists
          // This would be implemented with actual database call
          const userExists = false; // Mock implementation - in production, this would check the database
          if (userExists) {
            throw new Error('User already exists');
          }
        },
        compensation: async () => {
          // No compensation needed for check
        },
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'hash-password',
        action: async () => {
          // Hash password
          // bcrypt is already imported
          const password = (this.context as { password: string }).password;
          if (!password) {
            throw new Error('Password not provided in context');
          }
          this.context.passwordHash = await bcrypt.hash(password, 10);
        },
        compensation: async () => {
          // No compensation needed for hashing
        },
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'create-user',
        action: async () => {
          // Create user in database
          // This would be implemented with actual database call
          this.context.userId = 'user-123'; // Mock implementation - in production, this would create a real user
        },
        compensation: async () => {
          // Delete user if created
          if (this.context.userId) {
            // Implement user deletion
            // Compensating: Deleting user
          }
        },
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'send-welcome-email',
        action: async () => {
          // Send welcome email
          // Sending welcome email
        },
        compensation: async () => {
          // Send cancellation email
          // Sending cancellation email
        },
        retryCount: 0,
        maxRetries: 3,
      },
    ];
  }

  async execute(context: SagaContext): Promise<Record<string, unknown>> {
    this.context = context;
    this.completedSteps = [];

    try {
      for (const step of this.steps) {
        await this.executeStep(step);
        this.completedSteps.push(step.id);
      }

      return {
        success: true,
        userId: this.context.userId,
        message: 'User registration completed successfully'
      };
    } catch (error) {
      // Saga execution failed
      await this.compensate();
      throw error;
    }
  }

  private async executeStep(step: SagaStep): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
      try {
        await step.action();
        step.retryCount = attempt;
        return;
      } catch (error) {
        lastError = error as Error;
        step.retryCount = attempt;
        
        if (attempt < step.maxRetries) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error(`Step ${step.id} failed after ${step.maxRetries} retries`);
  }

  private async compensate(): Promise<void> {
    // Execute compensations in reverse order
    const completedSteps = [...this.completedSteps].reverse();
    
    for (const stepId of completedSteps) {
      const step = this.steps.find(s => s.id === stepId);
      if (step) {
        try {
          await step.compensation();
        } catch (error) {
          // Compensation failed for step
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Saga factory
export class SagaFactory {
  static createUserRegistrationSaga(): UserRegistrationSaga {
    return new UserRegistrationSaga();
  }
}
