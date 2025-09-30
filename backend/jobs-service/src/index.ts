import express from 'express';
import pino from 'pino';
import { createKafkaClient, validateBody, jobScheduleSchema, MultiLevelCache, EnvironmentValidator, CommonMiddleware, VersionMiddleware } from '@science-map/shared';
const app = express();
const PORT = process.env['PORT'] || 3005;
const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info'
});
// const config: ServiceConfig = {
//   port: Number(PORT),
//   kafka: {
//     brokers: [process.env['KAFKA_BROKER'] || 'localhost:9092']
//   },
// };

const commonMiddleware = CommonMiddleware.create();
commonMiddleware.setupAll(app, 'jobs-service', {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many job requests from this IP, please try again later.'
  }
});

const versionConfig: any = {
  serviceName: 'jobs-service',
  version: process.env['npm_package_version'] || '1.0.0',
  buildTime: new Date().toISOString(),
  environment: process.env['NODE_ENV'] || 'development',
  dependencies: {
    'express': '^4.18.0',
    'node-cron': '^3.0.0',
    'bull': '^4.0.0'
  },
  enableVersionHeader: true,
  enableCompatibilityCheck: true,
  enableHealthCheck: true
};

if (process.env['GIT_COMMIT']) {
  versionConfig.gitCommit = process.env['GIT_COMMIT'];
}
if (process.env['GIT_BRANCH']) {
  versionConfig.gitBranch = process.env['GIT_BRANCH'];
}

const versionMiddleware = VersionMiddleware.create(versionConfig);

app.use(versionMiddleware.middleware());
versionMiddleware.setupRoutes(app);
const kafkaClient = createKafkaClient('jobs-service');
// const poolManager = new ConnectionPoolManager();

const cache = new MultiLevelCache({
  maxSize: 500,
  ttl: 300000,
  level: 'l1' as any,
  strategy: 'lru' as any,
  evictionPolicy: 'lru' as any,
  compression: false,
  encryption: false,
  namespace: 'jobs-service'
}, process.env['REDIS_URL']);
app.get('/jobs', async (_req, res) => {
  const cacheKey = 'jobs:list';
  
  try {
    const cachedJobs = await cache.get(cacheKey);
    if (cachedJobs) {
      res.json({
        success: true,
        jobs: cachedJobs,
        cached: true
      });
      return;
    }
    
    const mockJobs = [
      { id: 1, type: 'data-processing', status: 'completed' },
      { id: 2, type: 'report-generation', status: 'running' },
      { id: 3, type: 'backup', status: 'pending' },
    ];
    
    await cache.set(cacheKey, mockJobs);
    
    res.json({
      success: true,
      jobs: mockJobs,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve jobs'
    });
  }
});
app.post('/jobs', validateBody(jobScheduleSchema), async (req, res) => {
  const { type, payload, scheduledFor, priority } = req.body;
  
  try {
    await cache.invalidate('jobs:list');
    
    res.json({
      success: true,
      job: { 
        id: Date.now(), 
        type, 
        payload,
        scheduledFor,
        priority,
        status: 'queued' 
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create job'
    });
  }
});
async function startServer() {
  try {
    const envValidator = EnvironmentValidator.create();
    const result = envValidator.validateServiceEnvironment('jobs-service');
    
    if (!result.isValid) {
      logger.error({ errors: result.errors }, 'Environment validation failed');
      process.exit(1);
    }
    
    if (result.warnings.length > 0) {
      logger.warn({ warnings: result.warnings }, 'Environment warnings');
    }
    
    logger.info('Environment validation completed');
    
    await kafkaClient.connect();
    logger.info('Jobs Service Kafka connected');
    
    // await poolManager.initialize();
    logger.info('Jobs Service connection pools initialized');
    
    app.listen(PORT, () => {
      logger.info(`Jobs Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Jobs Service startup error');
    process.exit(1);
  }
}
process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  // await poolManager.shutdown();
  process.exit(0);
});
startServer();
