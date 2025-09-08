import express from 'express';
import { MeiliSearch } from 'meilisearch';
import { z } from 'zod';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const app = express();
const port = process.env['PORT'] || 3005;
const metricsPort = 9095;

// Инициализация логгера
const logger = new Logger({
  service: 'search-service',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация мониторинга
const monitoring = createMonitoring({
  serviceName: 'search-service',
  serviceVersion: '0.1.0',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: 'search-service',
}, logger);

// Meilisearch подключение
const meilisearch = new MeiliSearch({
  host: process.env['MEILISEARCH_HOST'] || 'http://localhost:7700',
  apiKey: process.env['MEILISEARCH_API_KEY'],
});

// Middleware
app.use(express.json());

// Мониторинг middleware
app.use(monitoring.middleware.express);

// Схемы валидации
const searchSchema = z.object({
  query: z.string().min(1),
  index: z.string().optional(),
  filters: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

const indexDocumentSchema = z.object({
  index: z.string(),
  document: z.record(z.any()),
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.health.checkAll();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'search-service',
      version: '0.1.0',
      dependencies: healthStatus,
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'search-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Поиск
app.post('/api/search', async (req, res) => {
  try {
    const validatedData = searchSchema.parse(req.body);
    const { query, index = 'default', filters, limit = 20, offset = 0 } = validatedData;

    const searchIndex = meilisearch.index(index);
    
    const searchResult = await searchIndex.search(query, {
      limit,
      offset,
      filter: filters,
    });

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic: 'search-events',
      key: `search_${Date.now()}`,
      value: {
        event: 'search.performed',
        data: {
          query,
          index,
          filters,
          limit,
          offset,
          resultsCount: searchResult.hits.length,
          processingTimeMs: searchResult.processingTimeMs,
          searchedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'search-service',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'search-service',
      },
    });

    logger.info('Search performed successfully', {
      query,
      index,
      resultsCount: searchResult.hits.length,
      processingTimeMs: searchResult.processingTimeMs,
    });

    res.status(200).json({
      success: true,
      query,
      index,
      results: searchResult.hits,
      totalHits: searchResult.estimatedTotalHits,
      processingTimeMs: searchResult.processingTimeMs,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Индексация документа
app.post('/api/search/index', async (req, res) => {
  try {
    const validatedData = indexDocumentSchema.parse(req.body);
    const { index, document } = validatedData;

    const searchIndex = meilisearch.index(index);
    
    const result = await searchIndex.addDocuments([document]);

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic: 'search-events',
      key: result.taskUid,
      value: {
        event: 'document.indexed',
        data: {
          index,
          document,
          taskUid: result.taskUid,
          indexedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'search-service',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'search-service',
      },
    });

    logger.info('Document indexed successfully', {
      index,
      documentId: document.id,
      taskUid: result.taskUid,
    });

    res.status(201).json({
      success: true,
      message: 'Document indexed successfully',
      taskUid: result.taskUid,
      index,
      document,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Document indexing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Document indexing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение статуса задачи
app.get('/api/search/task/:taskUid', async (req, res) => {
  try {
    const { taskUid } = req.params;
    const { index } = req.query;

    if (!index) {
      return res.status(400).json({
        error: 'Index is required',
        message: 'Index query parameter is required',
      });
    }

    const searchIndex = meilisearch.index(index as string);
    const task = await searchIndex.getTask(taskUid);

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    logger.error('Failed to get task status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskUid: req.params.taskUid,
    });

    res.status(500).json({
      error: 'Failed to get task status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение статистики индекса
app.get('/api/search/stats/:index', async (req, res) => {
  try {
    const { index } = req.params;

    const searchIndex = meilisearch.index(index);
    const stats = await searchIndex.getStats();

    res.status(200).json({
      success: true,
      index,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get index stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      index: req.params.index,
    });

    res.status(500).json({
      error: 'Failed to get index stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Подключаемся к Kafka
    await kafkaClient.connect();
    logger.info('Connected to Kafka');

    // Создаем топик для событий поиска
    await kafkaClient.createTopic('search-events', 3, 1);
    logger.info('Created search-events topic');

    // Создаем базовые индексы
    try {
      await meilisearch.createIndex('institutes', { primaryKey: 'id' });
      await meilisearch.createIndex('departments', { primaryKey: 'id' });
      await meilisearch.createIndex('researchers', { primaryKey: 'id' });
      logger.info('Created base indexes');
    } catch (error) {
      logger.warn('Some indexes may already exist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Запускаем сервер метрик
    const metricsServer = new MetricsServer(metricsPort);
    await metricsServer.start();
    logger.info(`Metrics server started on port ${metricsPort}`);

    // Запускаем основной сервер
    app.listen(port, () => {
      logger.info(`Search service server started on port ${port}`, {
        port,
        metricsPort,
        environment: process.env['NODE_ENV'] || 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();
