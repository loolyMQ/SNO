import './tracing';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';
import client from 'prom-client';

const app = express();

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register: register });
const httpRequestCounter = new client.Counter({
  name: 'deployment_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestCounter);
const PORT = process.env.PORT || 3009;
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// TODO: Implement proper metrics middleware in production
// Metrics will be collected at endpoint level instead

const kafkaClient = createKafkaClient('deployment-service');

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (_req, res) => {
  res.json({ 
    service: 'deployment-service', 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/deployments', (_req, res) => {
  res.json({ 
    service: 'deployment-service',
    status: 'operational',
    deployments: [],
    activeDeployments: 0
  });
});

app.post('/api/deployments', (req, res) => {
  try {
    // TODO: Add proper validation schema in production
    const { service, version, environment } = req.body || {};
    
    res.json({ 
      success: true, 
      deployment: {
        id: 'deploy-' + Date.now(),
        service: service || 'unknown-service',
        version: version || '1.0.0',
        environment: environment || 'development',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      message: 'Deployment initiated'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: 'Invalid deployment data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'deployment-service',
      action: 'kafka-connect'
    }, 'Deployment Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'deployment-service',
        port: PORT,
        action: 'server-start'
      }, 'Deployment Service running');
    });
  } catch (error) {
    logger.error({
      service: 'deployment-service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Deployment Service startup error');
    process.exit(1);
  }
}

startServer();
