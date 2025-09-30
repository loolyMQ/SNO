import { DI_TOKENS, KafkaClient, EventTypes, Topics } from '@science-map/shared';
import { EventProcessor, IUserLoginEvent, IUserRegisteredEvent } from '../services/event-processor';

export async function setupKafkaConsumers(container: { resolve: (t: unknown) => Promise<unknown> }) {
  const kafkaClient = (await container.resolve(DI_TOKENS.KAFKA_CLIENT)) as KafkaClient;
  const eventProcessor = (await container.resolve('EventProcessor')) as EventProcessor;

  await eventProcessor.initialize();

  await kafkaClient.subscribe([Topics.AUTH_EVENTS], {
    [Topics.AUTH_EVENTS]: async (message) => {
      const event = message as { type: string } & Partial<IUserRegisteredEvent & IUserLoginEvent>;
      switch (event.type) {
        case EventTypes.USER_REGISTERED:
          await eventProcessor.processUserRegistered(event as IUserRegisteredEvent);
          break;
        case EventTypes.USER_LOGIN:
          await eventProcessor.processUserLogin(event as IUserLoginEvent);
          break;
      }
    }
  });
}


