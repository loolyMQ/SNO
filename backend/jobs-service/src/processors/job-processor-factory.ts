import { IJobProcessor } from './base';
import { EmailNotificationProcessor } from './email';
import { DataExportProcessor } from './data-export';
import { IndexUpdateProcessor } from './index-update';
import { ReportGenerationProcessor } from './report';
import { CleanupProcessor } from './cleanup';
import { UserOnboardingProcessor } from './onboarding';

export class JobProcessorFactory {
  private processors: Map<string, () => IJobProcessor> = new Map();

  constructor() {
    this.registerProcessor('email_notification', () => new EmailNotificationProcessor());
    this.registerProcessor('data_export', () => new DataExportProcessor());
    this.registerProcessor('index_update', () => new IndexUpdateProcessor());
    this.registerProcessor('report_generation', () => new ReportGenerationProcessor());
    this.registerProcessor('cleanup', () => new CleanupProcessor());
    this.registerProcessor('user_onboarding', () => new UserOnboardingProcessor());
  }

  registerProcessor(type: string, factory: () => IJobProcessor): void {
    this.processors.set(type, factory);
  }

  createProcessor(type: string): IJobProcessor {
    const factory = this.processors.get(type);
    if (!factory) {
      throw new Error(`No processor registered for job type: ${type}`);
    }
    return factory();
  }

  getSupportedTypes(): string[] {
    return Array.from(this.processors.keys());
  }

  isTypeSupported(type: string): boolean {
    return this.processors.has(type);
  }
}
