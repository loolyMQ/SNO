import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample API keys
  const sampleApiKeys = [
    {
      key: 'sk_test_1234567890abcdef',
      name: 'Development API Key',
      description: 'API key for development environment',
      permissions: ['read', 'write'],
      isActive: true,
    },
    {
      key: 'sk_prod_abcdef1234567890',
      name: 'Production API Key',
      description: 'API key for production environment',
      permissions: ['read'],
      isActive: true,
    },
  ];

  for (const apiKeyData of sampleApiKeys) {
    const existingApiKey = await prisma.apiKey.findFirst({
      where: { key: apiKeyData.key },
    });

    if (!existingApiKey) {
      const apiKey = await prisma.apiKey.create({
        data: apiKeyData,
      });
      console.log(`Created API key: ${apiKey.name}`);
    } else {
      console.log(`API key already exists: ${apiKeyData.name}`);
    }
  }

  // Create sample service health records
  const services = ['auth-service', 'graph-service', 'search-service', 'jobs-service'];
  
  for (const serviceName of services) {
    const existingHealth = await prisma.serviceHealth.findFirst({
      where: { serviceName },
    });

    if (!existingHealth) {
      const health = await prisma.serviceHealth.create({
        data: {
          serviceName,
          status: 'healthy',
          responseTime: 50,
          lastChecked: new Date(),
        },
      });
      console.log(`Created health record for: ${health.serviceName}`);
    } else {
      console.log(`Health record already exists for: ${serviceName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
