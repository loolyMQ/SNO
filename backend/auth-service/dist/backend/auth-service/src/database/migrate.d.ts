interface Migration {
    version: string;
    name: string;
    sql: string;
    appliedAt?: Date;
}
declare class MigrationRunner {
    private migrationsPath;
    private dbPool;
    constructor();
    ensureMigrationsTable(): Promise<void>;
    getAppliedMigrations(): Promise<string[]>;
    getPendingMigrations(): Promise<Migration[]>;
    getAllMigrations(): Migration[];
    applyMigration(migration: Migration): Promise<void>;
    runMigrations(): Promise<void>;
    getMigrationStatus(): Promise<{
        applied: string[];
        pending: Migration[];
        total: number;
    }>;
    private generateMigrationId;
    private calculateChecksum;
}
export declare const migrationRunner: MigrationRunner;
export {};
//# sourceMappingURL=migrate.d.ts.map