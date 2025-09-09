import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample jobs
  const sampleJobs = [
    {
      name: 'Daily Report Generation',
      description: 'Generate daily analytics report',
      type: 'REPORT_GENERATION' as const,
      status: 'PENDING' as const,
      priority: 3,
      data: {
        reportType: 'daily',
        recipients: ['admin@science-map.com'],
      },
    },
    {
      name: 'Database Cleanup',
      description: 'Clean up old temporary data',
      type: 'CLEANUP' as const,
      status: 'PENDING' as const,
      priority: 1,
      data: {
        retentionDays: 30,
        tables: ['temp_data', 'old_logs'],
      },
    },
    {
      name: 'Data Backup',
      description: 'Create backup of critical data',
      type: 'BACKUP' as const,
      status: 'PENDING' as const,
      priority: 5,
      data: {
        backupType: 'full',
        destination: 's3://backups/science-map',
      },
    },
  ];

  for (const jobData of sampleJobs) {
    const existingJob = await prisma.job.findFirst({
      where: { name: jobData.name },
    });

    if (!existingJob) {
      const job = await prisma.job.create({
        data: jobData,
      });
      console.log(`Created job: ${job.name}`);
    } else {
      console.log(`Job already exists: ${jobData.name}`);
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
