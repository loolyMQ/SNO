import { DI_TOKENS, DIUtils } from '@science-map/shared';
import { setupMiddleware, setupMetricsRoute } from './middleware';
import { setupRoutes } from './routes';
import { setupKafkaConsumers } from './consumers';
export class GraphServer {
    container;
    app;
    server;
    constructor() {
        this.container = DIUtils.createServiceContainer('graph-service');
    }
    async start() {
        const logger = (await this.container.resolve(DI_TOKENS.LOGGER));
        try {
            await this.container.initializeAll();
            this.app = (await this.container.resolve(DI_TOKENS.EXPRESS_APP));
            setupMiddleware(this.app, this.container, logger);
            setupMetricsRoute(this.app);
            const graphService = await this.container.resolve('GraphService');
            setupRoutes(this.app, graphService);
            await setupKafkaConsumers(this.container);
            const config = this.container.get(DI_TOKENS.CONFIG);
            this.server = this.app.listen(config.port);
            logger.info(`Graph Service (DI) running on port ${config.port}`);
            this.setupGracefulShutdown(logger);
        }
        catch (error) {
            logger.error(`Failed to start Graph Service: ${error?.message || String(error)}`);
            process.exit(1);
        }
    }
    setupGracefulShutdown(logger) {
        const shutdown = async (signal) => {
            logger.info(`📡 Received ${signal}, shutting down gracefully`);
            await DIUtils.shutdownService(this.container, this.server);
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}
//# sourceMappingURL=graph-server.js.map