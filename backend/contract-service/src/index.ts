import './tracing';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';
import client from 'prom-client';

const app = express();

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register: register });
// TODO: Implement HTTP request counter
// const _httpRequestCounter = new client.Counter({
//   name: 'contract_service_http_requests_total',
//   help: 'Total number of HTTP requests',
//   labelNames: ['method', 'route', 'status'],
//   registers: [register]
// });
const PORT = process.env.PORT || 3008;
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

// Metrics middleware - removed due to TypeScript compatibility issues
// Metrics will be collected at endpoint level instead
// TODO: Implement proper metrics middleware in production

const kafkaClient = createKafkaClient('contract-service');

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const ContractSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(['draft', 'active', 'deprecated']),
  createdAt: z.date(),
  updatedAt: z.date()
});

app.get('/health', (req, res) => {
  res.json({ 
    service: 'contract-service', 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/contracts', (req, res) => {
  res.json({ 
    service: 'contract-service',
    status: 'operational',
    contracts: [],
    totalContracts: 0
  });
});

app.post('/api/contracts', (req, res) => {
  try {
    const contract = ContractSchema.parse(req.body);
    res.json({ 
      success: true, 
      contract: contract,
      message: 'Contract created successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: 'Invalid contract data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'contract-service',
      action: 'kafka-connect'
    }, 'Contract Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'contract-service',
        port: PORT,
        action: 'server-start'
      }, 'Contract Service running');
    });
  } catch (error) {
    logger.error({
      service: 'contract-service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Contract Service startup error');
    process.exit(1);
  }
}

startServer();
