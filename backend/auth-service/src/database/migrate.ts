import { createPostgreSQLPool, PostgreSQLConnectionPool } from '@science-map/shared';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface Migration {
  version: string;
  name: string;
  sql: string;
  appliedAt?: Date;
}

class MigrationRunner {
  private migrationsPath: string;
  private dbPool: PostgreSQLConnectionPool;

  constructor() {
    this.migrationsPath = path.join(__dirname, '../../prisma/migrations');
    
    this.dbPool = createPostgreSQLPool(
      {
        name: 'migration-db-pool',
        min: 1,
        max: 5,
        acquireTimeoutMillis: 5000,
        createTimeoutMillis: 3000,
        destroyTimeoutMillis: 1000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 1000,
        maxRetries: 3,
        enableHealthCheck: false,
        healthCheckIntervalMs: 30000
      },
      {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432'),
        database: process.env['DB_NAME'] || 'science_map',
        user: process.env['DB_USER'] || 'postgres',
        password: process.env['DB_PASSWORD'] || 'postgres'
      },
      logger
    );
  }

  async ensureMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS _prisma_migrations_migration_name_idx 
      ON _prisma_migrations(migration_name);
    `;

    try {
      await this.dbPool.query(createTableSQL);
      logger.info('Migrations table ensured');
    } catch (error) {
      logger.error({ error }, 'Failed to create migrations table');
      throw error;
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.dbPool.query(
        'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY started_at'
      );
      return result.rows.map((row: { migration_name: string }) => row.migration_name);
    } catch (error) {
      logger.error({ error }, 'Failed to get applied migrations');
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = this.getAllMigrations();
    
    return allMigrations.filter(migration => 
      !appliedMigrations.includes(migration.name)
    );
  }

  getAllMigrations(): Migration[] {
    const migrations: Migration[] = [];
    
    if (!fs.existsSync(this.migrationsPath)) {
      logger.warn('Migrations directory not found');
      return migrations;
    }

    const migrationDirs = fs.readdirSync(this.migrationsPath)
      .filter(dir => fs.statSync(path.join(this.migrationsPath, dir)).isDirectory())
      .sort();

    for (const dir of migrationDirs) {
      const migrationFile = path.join(this.migrationsPath, dir, 'migration.sql');
      
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        const [version] = dir.split('_');
        
        migrations.push({
          version: version || '0.0.0',
          name: dir,
          sql
        });
      }
    }

    return migrations;
  }

  async applyMigration(migration: Migration): Promise<void> {
    const migrationId = this.generateMigrationId();
    const checksum = this.calculateChecksum(migration.sql);

    logger.info({ migration: migration.name }, 'Applying migration');

    try {
      await this.dbPool.transaction(async (client) => {
        
        await client.query(
          `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count) 
           VALUES ($1, $2, $3, NOW(), 0)`,
          [migrationId, checksum, migration.name]
        );

        
        await client.query(migration.sql);

        
        await client.query(
          `UPDATE _prisma_migrations 
           SET finished_at = NOW(), applied_steps_count = 1 
           WHERE id = $1`,
          [migrationId]
        );
      });

      logger.info({ migration: migration.name }, 'Migration applied successfully');
    } catch (error) {
      logger.error({ migration: migration.name, error }, 'Migration failed');
      
      
      try {
        await this.dbPool.query(
          `UPDATE _prisma_migrations 
           SET rolled_back_at = NOW(), logs = $2 
           WHERE id = $1`,
          [migrationId, JSON.stringify({ error: (error as Error).message })]
        );
      } catch (rollbackError) {
        logger.error({ rollbackError }, 'Failed to mark migration as rolled back');
      }
      
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    logger.info('Starting database migrations');

    try {
      await this.ensureMigrationsTable();
      const pendingMigrations = await this.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info({ count: pendingMigrations.length }, 'Found pending migrations');

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error({ error }, 'Migration process failed');
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    applied: string[];
    pending: Migration[];
    total: number;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const all = this.getAllMigrations();

    return {
      applied,
      pending,
      total: all.length
    };
  }

  private generateMigrationId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private calculateChecksum(sql: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(sql).digest('hex');
  }
}

export const migrationRunner = new MigrationRunner();

if (require.main === module) {
  migrationRunner.runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Migration process failed');
      process.exit(1);
    });
}
