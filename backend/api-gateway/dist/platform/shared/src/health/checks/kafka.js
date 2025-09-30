export async function createKafkaHealthCheck(kafka) {
    const startTime = Date.now();
    try {
        const admin = kafka.admin();
        await admin.connect();
        const brokerInfo = await getBrokerInfo(admin);
        const topicInfo = await getTopicInfo(admin);
        const consumerLag = await getConsumerLag(admin);
        await admin.disconnect();
        const responseTime = Date.now() - startTime;
        return {
            name: 'kafka',
            status: responseTime > 2000 ? 'degraded' : 'healthy',
            responseTime,
            lastCheck: Date.now(),
            brokers: brokerInfo,
            topics: topicInfo,
            consumerLag,
        };
    }
    catch (error) {
        return {
            name: 'kafka',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            brokers: {
                connected: 0,
                total: 0,
            },
            topics: {
                available: 0,
                total: 0,
            },
            consumerLag: 0,
        };
    }
}
async function getBrokerInfo(admin) {
    try {
        const metadata = await admin.describeCluster();
        return {
            connected: metadata.brokers.length,
            total: metadata.brokers.length,
        };
    }
    catch {
        return {
            connected: 0,
            total: 0,
        };
    }
}
async function getTopicInfo(admin) {
    try {
        const topics = await admin.listTopics();
        return {
            available: topics.topics?.length || 0,
            total: topics.topics?.length || 0,
        };
    }
    catch {
        return {
            available: 0,
            total: 0,
        };
    }
}
async function getConsumerLag(_admin) {
    try {
        return 0;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=kafka.js.map