import pino from 'pino';
import { Job, JobTypes } from './types';

export function createJobProcessors(logger: pino.Logger) {
  return {
    [JobTypes.EMAIL_NOTIFICATION]: async (job: Job) => {
      logger.info(`Processing email notification: ${job.payload['email']}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { emailSent: true, recipient: job.payload['email'] };
    },
    [JobTypes.DATA_EXPORT]: async (job: Job) => {
      logger.info(`Processing data export: ${job.payload['format']}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { exportUrl: 'https://example.com/export/file.csv' };
    },
    [JobTypes.INDEX_UPDATE]: async (job: Job) => {
      logger.info(`Processing index update: ${job.payload['type']}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { indexUpdated: true, documentsProcessed: (job.payload['count'] as number) || 0 };
    },
    [JobTypes.REPORT_GENERATION]: async (job: Job) => {
      logger.info(`Processing report generation: ${job.payload['reportType']}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return { reportUrl: 'https://example.com/reports/report.pdf' };
    },
    [JobTypes.CLEANUP]: async (job: Job) => {
      logger.info(`Processing cleanup: ${job.payload['target']}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { cleanedItems: (job.payload['itemCount'] as number) || 0 };
    },
    [JobTypes.USER_ONBOARDING]: async (job: Job) => {
      logger.info(`Processing user onboarding: ${job.payload['userId']}`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      return { onboardingCompleted: true, steps: ['welcome_email', 'tutorial', 'profile_setup'] };
    }
  } as const;
}


