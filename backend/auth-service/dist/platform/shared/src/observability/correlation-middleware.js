import { CorrelationManager } from './correlation';
import { LoggerFactory } from '../logging';
export class CorrelationMiddleware {
    static CORRELATION_HEADER = 'x-correlation-id';
    static REQUEST_HEADER = 'x-request-id';
    static USER_HEADER = 'x-user-id';
    static createMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = CorrelationManager.extractCorrelationId(req.headers) ||
                CorrelationManager.generateCorrelationId();
            const requestId = CorrelationManager.extractRequestId(req.headers) || CorrelationManager.generateRequestId();
            const userId = CorrelationManager.extractUserId(req.headers);
            req.correlationId = correlationId;
            req.requestId = requestId;
            req.userId = userId || '';
            const context = {
                correlationId,
                requestId,
                userId: userId || '',
                service: serviceName,
                operation: req.method + ' ' + req.path,
                startTime: Date.now(),
            };
            req.correlationContext = context;
            _res.set(this.CORRELATION_HEADER, correlationId);
            _res.set(this.REQUEST_HEADER, requestId);
            if (userId) {
                _res.set(this.USER_HEADER, userId);
            }
            const logger = LoggerFactory.createRequestLogger(serviceName, requestId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                userId: userId || '',
                method: req.method,
                path: req.path,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
            }, 'Request started');
            const originalSend = _res.send;
            _res.send = function (data) {
                const duration = Date.now() - context.startTime;
                logger.info({
                    correlationId,
                    requestId,
                    userId: userId || '',
                    method: req.method,
                    path: req.path,
                    statusCode: _res.statusCode,
                    duration,
                }, 'Request completed');
                return originalSend.call(this, data);
            };
            next();
        };
    }
    static createServiceMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const userId = req.userId;
            const context = {
                correlationId,
                requestId,
                userId: userId || '',
                service: serviceName,
                operation: req.method + ' ' + req.path,
                startTime: Date.now(),
            };
            req.correlationContext = context;
            const logger = LoggerFactory.createRequestLogger(serviceName, requestId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                userId: userId || '',
                service: serviceName,
                method: req.method,
                path: req.path,
            }, 'Service request');
            next();
        };
    }
    static createKafkaMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const logger = LoggerFactory.createRequestLogger(serviceName, requestId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                service: serviceName,
                kafkaTopic: req.body?.topic,
                kafkaPartition: req.body?.partition,
            }, 'Kafka message processing');
            next();
        };
    }
    static createDatabaseMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const logger = LoggerFactory.createRequestLogger(serviceName, requestId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                service: serviceName,
                database: req.body?.database,
                table: req.body?.table,
                operation: req.body?.operation,
            }, 'Database operation');
            next();
        };
    }
    static createExternalServiceMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const logger = LoggerFactory.createRequestLogger(serviceName, requestId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                service: serviceName,
                externalService: req.body?.externalService,
                endpoint: req.body?.endpoint,
            }, 'External service call');
            next();
        };
    }
    static createAuditMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const userId = req.userId;
            const logger = LoggerFactory.createAuditLogger(serviceName, userId);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                userId: userId || '',
                service: serviceName,
                action: req.method + ' ' + req.path,
                resource: req.path,
                timestamp: new Date().toISOString(),
            }, 'Audit log');
            next();
        };
    }
    static createMetricsMiddleware(serviceName) {
        return (req, _res, next) => {
            const correlationId = req.correlationId || CorrelationManager.generateCorrelationId();
            const requestId = req.requestId || CorrelationManager.generateRequestId();
            const logger = LoggerFactory.createMetricsLogger(serviceName);
            req.logger = logger;
            logger.info({
                correlationId,
                requestId,
                service: serviceName,
                method: req.method,
                path: req.path,
                timestamp: new Date().toISOString(),
            }, 'Metrics collection');
            next();
        };
    }
    static getCorrelationId(req) {
        return req.correlationId;
    }
    static getRequestId(req) {
        return req.requestId;
    }
    static getUserId(req) {
        return req.userId;
    }
    static getContext(req) {
        return req.correlationContext;
    }
    static createChildContext(parentContext, operation) {
        return {
            ...parentContext,
            requestId: CorrelationManager.generateRequestId(),
            operation,
            startTime: Date.now(),
        };
    }
}
//# sourceMappingURL=correlation-middleware.js.map