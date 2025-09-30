import { DI_TOKENS, EventTypes, Topics } from '@science-map/shared';
export async function setupKafkaConsumers(container) {
    const kafkaClient = (await container.resolve(DI_TOKENS.KAFKA_CLIENT));
    const eventProcessor = (await container.resolve('EventProcessor'));
    await eventProcessor.initialize();
    await kafkaClient.subscribe([Topics.AUTH_EVENTS], {
        [Topics.AUTH_EVENTS]: async (message) => {
            const event = message;
            switch (event.type) {
                case EventTypes.USER_REGISTERED:
                    await eventProcessor.processUserRegistered(event);
                    break;
                case EventTypes.USER_LOGIN:
                    await eventProcessor.processUserLogin(event);
                    break;
            }
        }
    });
}
//# sourceMappingURL=consumers.js.map