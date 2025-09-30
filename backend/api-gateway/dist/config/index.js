import pino from 'pino';
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});
export const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    graph: process.env.GRAPH_SERVICE_URL || 'http://localhost:3004',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3005',
    jobs: process.env.JOBS_SERVICE_URL || 'http://localhost:3006'
};
export const PORT = process.env.PORT || 3002;
//# sourceMappingURL=index.js.map