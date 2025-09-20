import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';

const app = express();
const PORT = process.env.PORT || 3004;

const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'search-service',
    groupId: 'search-service-group',
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
    service: 'search-service',
    timestamp: Date.now(),
  });
});

app.get('/search', (req, res) => {
  const query = req.query.q as string;
  
  const mockResults = [
    { id: 1, title: 'Computer Science', type: 'field' },
    { id: 2, title: 'Machine Learning', type: 'topic' },
    { id: 3, title: 'Data Structures', type: 'concept' },
  ].filter(item => 
    !query || item.title.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json({
    success: true,
    results: mockResults,
    query,
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Search Service Kafka connected');

    app.listen(PORT, () => {
      console.log(`🚀 Search Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Search Service startup error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
