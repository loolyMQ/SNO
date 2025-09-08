import { createKafkaClient, defaultKafkaConfig, Logger } from '../index';

// Пример использования Kafka клиента
async function kafkaExample() {
  // Создаем логгер
  const logger = new Logger({
    service: 'kafka-example',
    environment: 'development',
  } as any);

  // Создаем Kafka клиент
  const kafkaClient = createKafkaClient(defaultKafkaConfig, logger);

  try {
    // Подключаемся к Kafka
    await kafkaClient.connect();

    // Создаем топик
    await kafkaClient.createTopic('user-events', 3, 1);

    // Отправляем сообщение
    await kafkaClient.sendMessage({
      topic: 'user-events',
      key: 'user-123',
      value: {
        eventType: 'user.created',
        userId: '123',
        email: 'user@example.com',
        timestamp: new Date().toISOString(),
      },
      headers: {
        'content-type': 'application/json',
        'source': 'auth-service',
      },
    });

    // Создаем консьюмер
    await kafkaClient.createConsumer({
      groupId: 'user-events-processor',
      topics: ['user-events'],
      fromBeginning: false,
    });

    // Запускаем обработку сообщений
    await kafkaClient.startConsuming(async (payload) => {
      const message = JSON.parse(payload.message.value?.toString() || '{}');
      
      logger.info('Processing message', {
        service: 'kafka-example',
        topic: payload.topic,
        partition: payload.partition,
        offset: payload.message.offset,
        message,
      } as any);

      // Здесь ваша бизнес-логика
      switch (message.eventType) {
        case 'user.created':
          await handleUserCreated(message);
          break;
        case 'user.updated':
          await handleUserUpdated(message);
          break;
        default:
          logger.warn('Unknown event type', { service: 'kafka-example', eventType: message.eventType } as any);
      }
    });

  } catch (error) {
    logger.error('Kafka example failed', {
      service: 'kafka-example',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as any);
  } finally {
    // Отключаемся от Kafka
    await kafkaClient.disconnect();
  }
}

// Обработчики событий
async function handleUserCreated(userData: any) {
  console.log('Handling user created:', userData);
  // Логика обработки создания пользователя
}

async function handleUserUpdated(userData: any) {
  console.log('Handling user updated:', userData);
  // Логика обработки обновления пользователя
}

// Запуск примера
if (require.main === module) {
  kafkaExample().catch(console.error);
}

export { kafkaExample };
