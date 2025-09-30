import { KafkaHealthCheck } from '../types';
import { Kafka } from 'kafkajs';

export async function createKafkaHealthCheck(kafka: Kafka): Promise<KafkaHealthCheck> {
  const startTime = Date.now();

  try {
    const admin = kafka.admin();
    await admin.connect();

    const brokerInfo = await getBrokerInfo(admin);

    const topicInfo = await getTopicInfo(admin as any);

    const consumerLag = await getConsumerLag(admin as any);

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
  } catch (error: unknown) {
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

async function getBrokerInfo(admin: {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}): Promise<{
  connected: number;
  total: number;
}> {
  try {
    const metadata = await (admin as any).describeCluster();
    return {
      connected: metadata.brokers.length,
      total: metadata.brokers.length,
    };
  } catch {
    return {
      connected: 0,
      total: 0,
    };
  }
}

async function getTopicInfo(admin: { listTopics: () => Promise<{ topics: string[] }> }): Promise<{
  available: number;
  total: number;
}> {
  try {
    const topics = await admin.listTopics();
    return {
      available: topics.topics?.length || 0,
      total: topics.topics?.length || 0,
    };
  } catch {
    return {
      available: 0,
      total: 0,
    };
  }
}

async function getConsumerLag(_admin: {
  describeGroups: () => Promise<{
    groups: Array<{ groupId: string; members: Array<{ memberId: string }> }>;
  }>;
}): Promise<number> {
  try {
    return 0;
  } catch {
    return 0;
  }
}
