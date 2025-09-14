import { Kafka } from 'kafkajs';

// Kafka клиент для обработки событий
const kafka = new Kafka({
  clientId: 'event-processor',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'event-processor-group' });

// Обработчик событий графа
async function handleGraphUpdate(event: any) {
  console.log('📊 Получено событие обновления графа:', {
    nodeCount: event.data.nodeCount,
    edgeCount: event.data.edgeCount,
    temperature: event.data.temperature,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Здесь можно добавить логику обработки:
  // - Сохранение в базу данных
  // - Отправка уведомлений
  // - Аналитика
  // - Кэширование
}

// Обработчик событий API
async function handleApiRequest(event: any) {
  console.log('🌐 Получено событие API запроса:', {
    method: event.data.method,
    path: event.data.path,
    statusCode: event.data.statusCode,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Здесь можно добавить логику:
  // - Логирование запросов
  // - Аналитика использования API
  // - Мониторинг производительности
  // - Rate limiting
}

// Обработчик событий поиска
async function handleSearchEvent(event: any) {
  console.log('🔍 Получено событие поиска:', {
    query: event.data.query,
    resultsCount: event.data.resultsCount,
    filters: event.data.filters,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Здесь можно добавить логику:
  // - Аналитика поисковых запросов
  // - Улучшение поисковых алгоритмов
  // - Кэширование популярных запросов
}

// Обработчик событий задач
async function handleJobEvent(event: any) {
  console.log('⚙️ Получено событие задачи:', {
    jobId: event.data.jobId,
    jobType: event.data.jobType,
    status: event.data.status,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Здесь можно добавить логику:
  // - Мониторинг выполнения задач
  // - Уведомления о статусе задач
  // - Аналитика производительности
}

// Инициализация и запуск
async function startEventProcessor() {
  try {
    await consumer.connect();
    console.log('✅ Event Processor подключен к Kafka');
    
    // Подписываемся на все топики
    await consumer.subscribe({ topic: 'graph-updates', fromBeginning: false });
    await consumer.subscribe({ topic: 'api-requests', fromBeginning: false });
    await consumer.subscribe({ topic: 'search-events', fromBeginning: false });
    await consumer.subscribe({ topic: 'job-events', fromBeginning: false });
    
    // Запускаем обработку сообщений
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          
          switch (topic) {
            case 'graph-updates':
              await handleGraphUpdate(event);
              break;
            case 'api-requests':
              await handleApiRequest(event);
              break;
            case 'search-events':
              await handleSearchEvent(event);
              break;
            case 'job-events':
              await handleJobEvent(event);
              break;
            default:
              console.log(`📨 Неизвестный топик: ${topic}`, event);
          }
        } catch (error) {
          console.error(`❌ Ошибка обработки сообщения из топика ${topic}:`, error);
        }
      },
    });
    
    console.log('🎯 Event Processor запущен и слушает события...');
    console.log('📋 Подписан на топики: graph-updates, api-requests, search-events, job-events');
    
  } catch (error) {
    console.error('❌ Ошибка запуска Event Processor:', error);
    process.exit(1);
  }
}

// Обработка завершения процесса
process.on('SIGINT', async () => {
  console.log('\n🛑 Завершение Event Processor...');
  try {
    await consumer.disconnect();
    console.log('✅ Event Processor отключен от Kafka');
  } catch (error) {
    console.error('❌ Ошибка при отключении:', error);
  }
  process.exit(0);
});

// Запуск
startEventProcessor();
