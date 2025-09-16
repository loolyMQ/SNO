import express from 'express';
import cors from 'cors';
import { KafkaClient } from '../../../shared/src/kafka/client';

const app = express();
const PORT = process.env.PORT || 3005;

// Kafka клиент
const kafkaClient = new KafkaClient({
  port: 3005,
  kafka: {
    clientId: 'jobs-service',
    brokers: ['localhost:9092'],
    groupId: 'jobs-service-group',
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Простые типы
interface Job {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: any;
  createdAt: number;
  updatedAt: number;
}

let jobs: Job[] = [
  {
    id: 'job-1',
    type: 'data-processing',
    status: 'completed',
    data: { processed: 100 },
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3000000,
  },
  {
    id: 'job-2',
    type: 'index-update',
    status: 'running',
    data: { progress: 50 },
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 600000,
  },
];

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Jobs Service',
      status: 'healthy',
      timestamp: Date.now(),
    },
  });
});

app.get('/api/jobs', (req, res) => {
  res.json({
    success: true,
    data: {
      jobs,
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      running: jobs.filter((j) => j.status === 'running').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    },
    timestamp: Date.now(),
  });
});

app.post('/api/jobs', (req, res) => {
  const { type, data } = req.body;

  const newJob: Job = {
    id: `job-${Date.now()}`,
    type,
    status: 'pending',
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.push(newJob);

  // Публикуем событие создания задачи
  setImmediate(async () => {
    try {
      await kafkaClient.publishEvent('job-events', {
        id: `job-created-${Date.now()}`,
        type: 'JOB_CREATED',
        source: 'jobs-service',
        data: {
          jobId: newJob.id,
          jobType: newJob.type,
          status: newJob.status,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Ошибка публикации события создания задачи:', error);
    }
  });

  res.json({
    success: true,
    data: newJob,
    timestamp: Date.now(),
  });
});

// Инициализация Kafka
async function initializeKafka() {
  try {
    await kafkaClient.connect();
    console.log('✅ Kafka клиент подключен');
  } catch (error) {
    console.error('❌ Ошибка подключения к Kafka:', error);
  }
}

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Jobs Service запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  await initializeKafka();
});
