export declare enum BackupType {
    FULL = "full",
    INCREMENTAL = "incremental",
    DIFFERENTIAL = "differential"
}
export declare enum BackupStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum BackupRetention {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
export interface BackupConfig {
    id: string;
    name: string;
    description: string;
    source: {
        type: 'database' | 'filesystem' | 'kafka' | 'redis';
        connectionString?: string;
        path?: string;
        tables?: string[];
        topics?: string[];
    };
    destination: {
        type: 's3' | 'local' | 'azure' | 'gcp';
        bucket?: string;
        path: string;
        credentials: Record<string, string>;
    };
    schedule: {
        cron: string;
        timezone: string;
    };
    retention: {
        policy: BackupRetention;
        count: number;
    };
    compression: boolean;
    encryption: boolean;
    rto: number;
    rpo: number;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}
export interface BackupJob {
    id: string;
    configId: string;
    type: BackupType;
    status: BackupStatus;
    startedAt: number;
    completedAt?: number;
    duration?: number;
    size?: number;
    path?: string;
    checksum?: string;
    error?: string;
    metadata?: Record<string, unknown>;
}
export interface BackupMetrics {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    averageDuration: number;
    totalSize: number;
    lastBackupAt?: number;
    nextBackupAt?: number;
}
export interface RTOConfig {
    service: string;
    rto: number;
    rpo: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    dependencies: string[];
    recoverySteps: string[];
}
//# sourceMappingURL=types.d.ts.map