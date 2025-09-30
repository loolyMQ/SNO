import pino from 'pino';
import { KafkaClient } from '@science-map/shared';
import { IUser } from '../repositories/user-repository';
export declare class PooledEventService {
    private kafkaPool;
    private logger;
    constructor(kafkaPool: KafkaClient, logger: pino.Logger);
    publishUserRegistered(user: IUser): Promise<void>;
    publishUserLogin(user: IUser): Promise<void>;
    publishUserLogout(userId: string): Promise<void>;
}
//# sourceMappingURL=event-service.d.ts.map