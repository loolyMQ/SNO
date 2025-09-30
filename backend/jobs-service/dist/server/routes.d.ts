import express from 'express';
import { IKafkaMessage } from '@science-map/shared';
import { InMemoryJobStore } from '../jobs/store';
export declare function setupHttpMetrics(app: express.Application): void;
export declare function setupRoutes(app: express.Application, store: InMemoryJobStore, kafka: {
    publish: (topic: string, msg: IKafkaMessage) => Promise<void>;
    isReady: () => boolean;
}, logger: {
    info: (msg: string | object, ...args: any[]) => void;
    error: (msg: string | object, ...args: any[]) => void;
}): void;
//# sourceMappingURL=routes.d.ts.map