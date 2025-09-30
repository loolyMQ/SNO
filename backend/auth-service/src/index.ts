import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';

const app = express();
const PORT = process.env.PORT || 3003;

const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'auth-service',
    groupId: 'auth-service-group',
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
    service: 'auth-service',
    timestamp: Date.now(),
  });
});

app.post('/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: { id: 1, email: req.body.email },
  });
});

app.post('/auth/register', (req, res) => {
  res.json({
    success: true,
    user: { id: 1, email: req.body.email },
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Auth Service Kafka connected');

    app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Auth Service startup error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
