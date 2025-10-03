import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface ConfigValue {
  value: unknown;
  source: 'env' | 'default' | 'override';
  timestamp: Date;
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    default?: unknown;
    validator?: (_value: unknown) => boolean;
  };
}

@injectable()
export class ConfigService {
  private config: Map<string, ConfigValue> = new Map();
  private schema: ConfigSchema = {};
  private overrides: Map<string, unknown> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {
    this.loadEnvironmentVariables();
    this.logger.info('ConfigService initialized');
  }

  public defineSchema(schema: ConfigSchema): void {
    this.schema = { ...this.schema, ...schema };
    this.validateAllConfig();
    this.logger.info('Configuration schema updated', { keys: Object.keys(schema) });
  }

  public get<T = unknown>(key: string, defaultValue?: T): T {
    const configValue = this.config.get(key);
    
    if (configValue) {
      this.metrics.incrementCounter('config_access_total', { key });
      return configValue.value as T;
    }
    
    if (defaultValue !== undefined) {
      this.set(key, defaultValue, 'default');
      return defaultValue;
    }
    
    const schemaKey = this.schema[key];
    if (schemaKey?.default !== undefined) {
      this.set(key, schemaKey.default, 'default');
      return schemaKey.default as T;
    }
    
    this.logger.warn(`Configuration key not found: ${key}`);
    this.metrics.incrementCounter('config_missing_total', { key });
    throw new Error(`Configuration key not found: ${key}`);
  }

  public set(key: string, value: unknown, source: 'env' | 'default' | 'override' = 'override'): void {
    const configValue: ConfigValue = {
      value,
      source,
      timestamp: new Date()
    };
    
    this.config.set(key, configValue);
    this.metrics.incrementCounter('config_set_total', { key, source });
    
    this.logger.debug(`Configuration set`, { key, source });
  }

  public has(key: string): boolean {
    return this.config.has(key);
  }

  public getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, configValue] of this.config) {
      result[key] = configValue.value;
    }
    
    return result;
  }

  public getBySource(source: 'env' | 'default' | 'override'): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, configValue] of this.config) {
      if (configValue.source === source) {
        result[key] = configValue.value;
      }
    }
    
    return result;
  }

  public override(key: string, value: unknown): void {
    this.overrides.set(key, value);
    this.set(key, value, 'override');
    this.logger.info(`Configuration overridden`, { key });
  }

  public reset(key: string): void {
    this.config.delete(key);
    this.overrides.delete(key);
    this.metrics.incrementCounter('config_reset_total', { key });
    this.logger.debug(`Configuration reset`, { key });
  }

  public validate(key: string, value: unknown): boolean {
    const schemaKey = this.schema[key];
    
    if (!schemaKey) {
      return true; // No schema defined, assume valid
    }
    
    if (schemaKey.required && (value === null || value === undefined)) {
      return false;
    }
    
    if (schemaKey.type === 'string' && typeof value !== 'string') {
      return false;
    }
    
    if (schemaKey.type === 'number' && typeof value !== 'number') {
      return false;
    }
    
    if (schemaKey.type === 'boolean' && typeof value !== 'boolean') {
      return false;
    }
    
    if (schemaKey.type === 'object' && typeof value !== 'object') {
      return false;
    }
    
    if (schemaKey.type === 'array' && !Array.isArray(value)) {
      return false;
    }
    
    if (schemaKey.validator && !schemaKey.validator(value)) {
      return false;
    }
    
    return true;
  }

  public getStats(): {
    totalKeys: number;
    bySource: Record<string, number>;
    schemaKeys: number;
  } {
    const bySource: Record<string, number> = {};
    
    for (const configValue of this.config.values()) {
      bySource[configValue.source] = (bySource[configValue.source] || 0) + 1;
    }
    
    return {
      totalKeys: this.config.size,
      bySource,
      schemaKeys: Object.keys(this.schema).length
    };
  }

  private loadEnvironmentVariables(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.set(key, value, 'env');
      }
    }
  }

  private validateAllConfig(): void {
    for (const [key, configValue] of this.config) {
      if (!this.validate(key, configValue.value)) {
        this.logger.warn(`Invalid configuration value`, { 
          key, 
          value: configValue.value,
          source: configValue.source 
        });
        this.metrics.incrementCounter('config_validation_error_total', { key });
      }
    }
  }
}
