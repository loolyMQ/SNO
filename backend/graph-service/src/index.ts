import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';

const app = express();
const PORT = process.env.PORT || 3002;

const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'graph-service',
    groupId: 'graph-service-group',
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
    service: 'graph-service',
    timestamp: Date.now(),
  });
});

app.get('/graph/data', (req, res) => {
  const mockData = {
    nodes: [
      { id: 1, name: 'Computer Science', x: 100, y: 100 },
      { id: 2, name: 'Mathematics', x: 200, y: 150 },
      { id: 3, name: 'Physics', x: 150, y: 200 },
    ],
    edges: [
      { source: 1, target: 2, weight: 0.8 },
      { source: 2, target: 3, weight: 0.6 },
    ],
  };
  
  res.json({
    success: true,
    data: mockData,
  });
});

app.post('/graph/update', (req, res) => {
  res.json({
    success: true,
    message: 'Graph updated',
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Graph Service Kafka connected');

    app.listen(PORT, () => {
      console.log(`🚀 Graph Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Graph Service startup error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
