import { BackupType, BackupStatus, } from './types';
import pino from 'pino';
import { randomUUID } from 'crypto';
export class BackupEngine {
    static instance;
    configs = new Map();
    jobs = new Map();
    rtoConfigs = new Map();
    logger;
    scheduler = null;
    constructor() {
        this.logger = pino({
            level: process.env['LOG_LEVEL'] || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        });
    }
    static getInstance() {
        if (!BackupEngine.instance) {
            BackupEngine.instance = new BackupEngine();
        }
        return BackupEngine.instance;
    }
    addConfig(config) {
        this.configs.set(config.id, config);
        this.logger.info({ configId: config.id }, 'Backup config added');
    }
    updateConfig(id, updates) {
        const existing = this.configs.get(id);
        if (!existing) {
            throw new Error(`Backup config ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };
        this.configs.set(id, updated);
        this.logger.info({ configId: id }, 'Backup config updated');
    }
    removeConfig(id) {
        this.configs.delete(id);
        this.logger.info({ configId: id }, 'Backup config removed');
    }
    addRTOConfig(config) {
        this.rtoConfigs.set(config.service, config);
        this.logger.info({ service: config.service }, 'RTO config added');
    }
    async executeBackup(configId, type = BackupType.FULL) {
        const config = this.configs.get(configId);
        if (!config) {
            throw new Error(`Backup config ${configId} not found`);
        }
        const job = {
            id: randomUUID(),
            configId,
            type,
            status: BackupStatus.PENDING,
            startedAt: Date.now(),
        };
        this.jobs.set(job.id, job);
        try {
            job.status = BackupStatus.IN_PROGRESS;
            this.logger.info({ jobId: job.id, configId }, 'Starting backup job');
            const result = await this.performBackup(config, job);
            job.status = BackupStatus.COMPLETED;
            job.completedAt = Date.now();
            job.duration = job.completedAt - job.startedAt;
            job.size = result.size;
            job.path = result.path;
            job.checksum = result.checksum;
            this.logger.info({
                jobId: job.id,
                duration: job.duration,
                size: job.size,
            }, 'Backup job completed');
        }
        catch (error) {
            job.status = BackupStatus.FAILED;
            job.completedAt = Date.now();
            job.duration = job.completedAt - job.startedAt;
            job.error = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error({
                jobId: job.id,
                error: job.error,
            }, 'Backup job failed');
        }
        return job;
    }
    async performBackup(config, job) {
        switch (config.source.type) {
            case 'database':
                return this.backupDatabase(config, job);
            case 'filesystem':
                return this.backupFilesystem(config, job);
            case 'kafka':
                return this.backupKafka(config, job);
            case 'redis':
                return this.backupRedis(config, job);
            default:
                throw new Error(`Unsupported backup source type: ${config.source.type}`);
        }
    }
    async backupDatabase(config, job) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `db-backup-${timestamp}.sql`;
        const path = `${config.destination.path}/${filename}`;
        this.logger.info({ jobId: job.id, path }, 'Starting database backup');
        return {
            size: 0,
            path,
            checksum: 'placeholder-checksum',
        };
    }
    async backupFilesystem(config, job) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fs-backup-${timestamp}.tar.gz`;
        const path = `${config.destination.path}/${filename}`;
        this.logger.info({ jobId: job.id, path }, 'Starting filesystem backup');
        return {
            size: 0,
            path,
            checksum: 'placeholder-checksum',
        };
    }
    async backupKafka(config, job) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `kafka-backup-${timestamp}.json`;
        const path = `${config.destination.path}/${filename}`;
        this.logger.info({ jobId: job.id, path }, 'Starting Kafka backup');
        return {
            size: 0,
            path,
            checksum: 'placeholder-checksum',
        };
    }
    async backupRedis(config, job) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `redis-backup-${timestamp}.rdb`;
        const path = `${config.destination.path}/${filename}`;
        this.logger.info({ jobId: job.id, path }, 'Starting Redis backup');
        return {
            size: 0,
            path,
            checksum: 'placeholder-checksum',
        };
    }
    getMetrics(configId) {
        const jobs = configId
            ? Array.from(this.jobs.values()).filter(job => job.configId === configId)
            : Array.from(this.jobs.values());
        const successfulJobs = jobs.filter(job => job.status === BackupStatus.COMPLETED);
        const failedJobs = jobs.filter(job => job.status === BackupStatus.FAILED);
        const totalDuration = successfulJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
        const totalSize = successfulJobs.reduce((sum, job) => sum + (job.size || 0), 0);
        const lastBackup = successfulJobs.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
        return {
            totalBackups: jobs.length,
            successfulBackups: successfulJobs.length,
            failedBackups: failedJobs.length,
            averageDuration: successfulJobs.length > 0 ? totalDuration / successfulJobs.length : 0,
            totalSize,
            lastBackupAt: lastBackup?.completedAt ?? 0,
            nextBackupAt: 0,
        };
    }
    getRTOConfig(service) {
        return this.rtoConfigs.get(service);
    }
    getAllRTOConfigs() {
        return Array.from(this.rtoConfigs.values());
    }
    startScheduler() {
        if (this.scheduler) {
            return;
        }
        this.scheduler = setInterval(() => {
            this.checkScheduledBackups();
        }, 60000);
        this.logger.info('Backup scheduler started');
    }
    stopScheduler() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
            this.logger.info('Backup scheduler stopped');
        }
    }
    async checkScheduledBackups() {
        const now = Date.now();
        for (const config of this.configs.values()) {
            if (!config.enabled) {
                continue;
            }
            const nextRun = this.getNextRunTime() || 0;
            if (nextRun && now >= nextRun) {
                try {
                    await this.executeBackup(config.id);
                }
                catch (error) {
                    this.logger.error({
                        configId: config.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    }, 'Scheduled backup failed');
                }
            }
        }
    }
    getNextRunTime() {
        return null;
    }
    async shutdown() {
        this.stopScheduler();
        this.logger.info('Backup engine shutdown complete');
    }
}
//# sourceMappingURL=engine.js.map