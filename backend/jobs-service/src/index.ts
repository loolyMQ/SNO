import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createKafkaClient, ServiceConfig, ApiResponse } from '@science-map/shared';

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
app.use(compression());
app.use(cors());
app.use(express.json());

const kafkaClient = createKafkaClient(config);

app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'Jobs Service',
      version: '1.0.0',
      status: 'running',
    },
    timestamp: Date.now(),
  };
  res.json(response);
});

app.get('/api/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'Jobs Service',
      status: 'healthy',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
  res.json(response);
});

async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Jobs Service Kafka подключен');
    
    app.listen(PORT, () => {
      console.log(`🚀 Jobs Service запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска Jobs Service:', error);
    process.exit(1);
  }
}

startServer();