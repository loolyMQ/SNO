import { AuthServer } from './server/auth-server';
import { logger } from './utils/logger';

const PORT = parseInt(process.env['PORT'] || '3003');

async function start() {
  const server = new AuthServer();
  
  try {
    await server.start(PORT);
  } catch (error) {
    logger.error('Failed to start auth server:', error);
    process.exit(1);
  }
}

start();

