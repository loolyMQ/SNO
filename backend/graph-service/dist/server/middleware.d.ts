import express from 'express';
import { DIContainer } from '@science-map/shared';
export declare function setupMiddleware(app: express.Application, container: DIContainer, logger: {
    info: (m: string) => void;
    error: (m: string) => void;
}): void;
export declare function setupMetricsRoute(app: express.Application): void;
//# sourceMappingURL=middleware.d.ts.map