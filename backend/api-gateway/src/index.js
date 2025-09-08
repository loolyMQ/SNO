"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var express_rate_limit_1 = require("express-rate-limit");
var shared_1 = require("@platform/shared");
var monitoring_1 = require("@platform/monitoring");
var app = (0, express_1.default)();
var port = process.env['PORT'] || 3001;
var metricsPort = 9091;
// Инициализация логгера
var logger = new shared_1.Logger({
    service: 'api-gateway',
    environment: process.env['NODE_ENV'] || 'development',
});
// Инициализация мониторинга
var monitoring = (0, monitoring_1.createMonitoring)({
    serviceName: 'api-gateway',
    serviceVersion: '0.1.0',
    environment: process.env['NODE_ENV'] || 'development',
});
// Инициализация Kafka клиента
var kafkaClient = (0, shared_1.createKafkaClient)(__assign(__assign({}, shared_1.defaultKafkaConfig), { clientId: 'api-gateway' }), logger);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: 'Too many requests from this IP',
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Мониторинг middleware
app.use(monitoring.middleware.express);
// Health check endpoint
app.get('/health', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var healthStatus, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, monitoring.health.checkAll()];
            case 1:
                healthStatus = _a.sent();
                res.status(200).json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'api-gateway',
                    version: '0.1.0',
                    dependencies: healthStatus,
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger.error('Health check failed', {
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                });
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    service: 'api-gateway',
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// API routes
app.get('/api/status', function (req, res) {
    res.json({
        service: 'api-gateway',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
    });
});
// Event publishing endpoint
app.post('/api/events', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, topic, event_1, data, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, topic = _a.topic, event_1 = _a.event, data = _a.data;
                if (!topic || !event_1 || !data) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Missing required fields: topic, event, data',
                        })];
                }
                // Отправляем событие в Kafka
                return [4 /*yield*/, kafkaClient.sendMessage({
                        topic: topic,
                        key: data.id || 'api-gateway',
                        value: {
                            event: event_1,
                            data: data,
                            timestamp: new Date().toISOString(),
                            source: 'api-gateway',
                        },
                        headers: {
                            'content-type': 'application/json',
                            'source': 'api-gateway',
                        },
                    })];
            case 1:
                // Отправляем событие в Kafka
                _b.sent();
                logger.info('Event published', {
                    topic: topic,
                    event: event_1,
                    dataId: data.id,
                });
                res.status(200).json({
                    success: true,
                    message: 'Event published successfully',
                    topic: topic,
                    event: event_1,
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                logger.error('Failed to publish event', {
                    error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                    body: req.body,
                });
                res.status(500).json({
                    error: 'Failed to publish event',
                    message: error_2 instanceof Error ? error_2.message : 'Unknown error',
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Error handling middleware
app.use(function (err, req, res, next) {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });
    res.status(500).json({
        error: 'Internal server error',
        message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong',
    });
});
// 404 handler
app.use('*', function (req, res) {
    res.status(404).json({
        error: 'Not found',
        message: "Route ".concat(req.method, " ").concat(req.originalUrl, " not found"),
    });
});
// Graceful shutdown
process.on('SIGTERM', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger.info('SIGTERM received, shutting down gracefully');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, kafkaClient.disconnect()];
            case 2:
                _a.sent();
                return [4 /*yield*/, monitoring.shutdown()];
            case 3:
                _a.sent();
                process.exit(0);
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                logger.error('Error during shutdown', {
                    error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                });
                process.exit(1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
process.on('SIGINT', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger.info('SIGINT received, shutting down gracefully');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, kafkaClient.disconnect()];
            case 2:
                _a.sent();
                return [4 /*yield*/, monitoring.shutdown()];
            case 3:
                _a.sent();
                process.exit(0);
                return [3 /*break*/, 5];
            case 4:
                error_4 = _a.sent();
                logger.error('Error during shutdown', {
                    error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                });
                process.exit(1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Start server
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var metricsServer, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    // Подключаемся к Kafka
                    return [4 /*yield*/, kafkaClient.connect()];
                case 1:
                    // Подключаемся к Kafka
                    _a.sent();
                    logger.info('Connected to Kafka');
                    metricsServer = new monitoring_1.MetricsServer(metricsPort);
                    return [4 /*yield*/, metricsServer.start()];
                case 2:
                    _a.sent();
                    logger.info("Metrics server started on port ".concat(metricsPort));
                    // Запускаем основной сервер
                    app.listen(port, function () {
                        logger.info("API Gateway server started on port ".concat(port), {
                            port: port,
                            metricsPort: metricsPort,
                            environment: process.env['NODE_ENV'] || 'development',
                        });
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    logger.error('Failed to start server', {
                        error: error_5 instanceof Error ? error_5.message : 'Unknown error',
                    });
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
startServer();
