import express from 'express';
import http from 'http';
import { DIContainer, DI_TOKENS, DIUtils } from '@science-map/shared';
import { setupMiddleware, setupMetricsRoute } from './middleware';
import { setupRoutes } from './routes';
import { setupKafkaConsumers } from './consumers';

export class GraphServer {
  private container: DIContainer;
  private app!: express.Application;
  private server!: http.Server;

  constructor() {
    this.container = DIUtils.createServiceContainer('graph-service');
    // GraphServer constructor
  }

  async start(): Promise<void> {
    const logger = (await this.container.resolve(DI_TOKENS.LOGGER)) as { info: (msg: string) => void; error: (msg: string) => void };
    try {
      await this.container.initializeAll();
      this.app = (await this.container.resolve(DI_TOKENS.EXPRESS_APP)) as express.Application;
      setupMiddleware(this.app, this.container, logger);
      setupMetricsRoute(this.app);
      const graphService = await this.container.resolve('GraphService');
      setupRoutes(this.app, graphService as any);
      await setupKafkaConsumers(this.container as any);
      const config = this.container.get(DI_TOKENS.CONFIG) as { port: number };
      this.server = this.app.listen(config.port);
      logger.info(`Graph Service (DI) running on port ${config.port}`);
      this.setupGracefulShutdown(logger);
    } catch (error) {
      logger.error(`Failed to start Graph Service: ${(error as Error)?.message || String(error)}`);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(logger: { info: (message: string) => void; error: (message: string) => void }): void {
    const shutdown = async (signal: string) => {
      logger.info(`📡 Received ${signal}, shutting down gracefully`);
      await DIUtils.shutdownService(this.container, this.server);
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}


