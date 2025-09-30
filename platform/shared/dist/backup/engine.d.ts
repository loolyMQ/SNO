import { BackupConfig, BackupJob, BackupType, BackupMetrics, RTOConfig } from './types';
export declare class BackupEngine {
    private static instance;
    private configs;
    private jobs;
    private rtoConfigs;
    private logger;
    private scheduler;
    constructor();
    static getInstance(): BackupEngine;
    addConfig(config: BackupConfig): void;
    updateConfig(id: string, updates: Partial<BackupConfig>): void;
    removeConfig(id: string): void;
    addRTOConfig(config: RTOConfig): void;
    executeBackup(configId: string, type?: BackupType): Promise<BackupJob>;
    private performBackup;
    private backupDatabase;
    private backupFilesystem;
    private backupKafka;
    private backupRedis;
    getMetrics(configId?: string): BackupMetrics;
    getRTOConfig(service: string): RTOConfig | undefined;
    getAllRTOConfigs(): RTOConfig[];
    startScheduler(): void;
    stopScheduler(): void;
    private checkScheduledBackups;
    private getNextRunTime;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=engine.d.ts.map