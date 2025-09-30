import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';

const app = express();
const PORT = process.env.PORT || 3005;

const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'jobs-service',
    groupId: 'jobs-service-group',
  },
};

app.use(helmet());
app.use(cors());
app.use(express.json());

const kafkaClient = createKafkaClient(config);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'jobs-service',
    timestamp: Date.now(),
  });
});

app.get('/jobs', (req, res) => {
  const mockJobs = [
    { id: 1, type: 'data-processing', status: 'completed' },
    { id: 2, type: 'report-generation', status: 'running' },
    { id: 3, type: 'backup', status: 'pending' },
  ];
  
  res.json({
    success: true,
    jobs: mockJobs,
  });
});

app.post('/jobs', (req, res) => {
  res.json({
    success: true,
    job: { id: Date.now(), type: req.body.type, status: 'queued' },
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Jobs Service Kafka connected');

    app.listen(PORT, () => {
      console.log(`🚀 Jobs Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Jobs Service startup error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
