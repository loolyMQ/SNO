
import { GraphServer } from './server/graph-server';
export { GraphServer } from './server/graph-server';
export { GraphService } from './services/graph-service';
export { GraphRepository } from './repository/graph-repository';
export { GraphAnalytics } from './services/graph-analytics';
export { EventProcessor } from './services/event-processor';

if (require.main === module) {
  const server = new GraphServer();
  server.start().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start Graph Server:', error);
    process.exit(1);
  });
}
