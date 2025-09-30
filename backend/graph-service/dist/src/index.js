"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const shared_1 = require("@science-map/shared");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3004;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const kafkaClient = (0, shared_1.createKafkaClient)('graph-service');
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        service: 'graph-service',
        timestamp: Date.now(),
    });
});
app.get('/graph/data', (req, res) => {
    const mockData = {
        nodes: [
            { id: 1, name: 'Computer Science', x: 100, y: 100 },
            { id: 2, name: 'Mathematics', x: 200, y: 150 },
            { id: 3, name: 'Physics', x: 150, y: 200 },
        ],
        edges: [
            { source: 1, target: 2, weight: 0.8 },
            { source: 2, target: 3, weight: 0.6 },
        ],
    };
    res.json({
        success: true,
        data: mockData,
    });
});
app.post('/graph/update', (req, res) => {
    res.json({
        success: true,
        message: 'Graph updated',
    });
});
async function startServer() {
    try {
        await kafkaClient.connect();
        console.log('✅ Graph Service Kafka connected');
        app.listen(PORT, () => {
            console.log(`🚀 Graph Service running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Graph Service startup error:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    await kafkaClient.disconnect();
    process.exit(0);
});
startServer();
