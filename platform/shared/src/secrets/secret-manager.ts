import { Secret, SecretType, SecretStatus, SecretAccess } from './types';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { SecretEncryption } from './secret-encryption';
import { SecretValidator } from './secret-validator';

export class SecretManager {
  private secrets: Map<string, Secret> = new Map();
  private accesses: Map<string, SecretAccess> = new Map();
  private encryption: SecretEncryption;
  private validator: SecretValidator;
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
    this.encryption = new SecretEncryption();
    this.validator = new SecretValidator();
  }

  createSecret(secret: Omit<Secret, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Secret {
    const validation = this.validator.validateSecret(secret);
    if (!validation.isValid) {
      throw new Error(`Secret validation failed: ${validation.errors.join(', ')}`);
    }

    const newSecret: Secret = {
      ...secret,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    };

    const encryptedValue = this.encryption.encrypt(secret.value);
    newSecret.value = encryptedValue;

    this.secrets.set(newSecret.id, newSecret);
    this.logger.info({ secretId: newSecret.id, name: newSecret.name }, 'Secret created');

    return newSecret;
  }

  getSecret(id: string, service: string, environment: string): Secret | null {
    const secret = this.secrets.get(id);
    if (!secret || secret.status !== SecretStatus.ACTIVE) {
      return null;
    }

    this.recordAccess(id, service, environment);

    const decryptedSecret = {
      ...secret,
      value: this.encryption.decrypt(secret.value),
    };

    return decryptedSecret;
  }

  getSecretByName(name: string, service: string, environment: string): Secret | null {
    const secret = Array.from(this.secrets.values()).find(
      s => s.name === name && s.status === SecretStatus.ACTIVE
    );

    if (!secret) {
      return null;
    }

    return this.getSecret(secret.id, service, environment);
  }

  updateSecret(id: string, updates: Partial<Secret>): Secret | null {
    const existing = this.secrets.get(id);
    if (!existing) {
      return null;
    }

    const updated: Secret = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.value && updates.value !== existing.value) {
      const validation = this.validator.validateSecret({ ...updated, value: updates.value });
      if (!validation.isValid) {
        throw new Error(`Secret validation failed: ${validation.errors.join(', ')}`);
      }
      updated.value = this.encryption.encrypt(updates.value);
    }

    this.secrets.set(id, updated);
    this.logger.info({ secretId: id }, 'Secret updated');

    return updated;
  }

  deleteSecret(id: string): boolean {
    const secret = this.secrets.get(id);
    if (!secret) {
      return false;
    }

    this.secrets.delete(id);
    this.logger.info({ secretId: id }, 'Secret deleted');

    return true;
  }

  listSecrets(service?: string, environment?: string): Secret[] {
    let secrets = Array.from(this.secrets.values());

    if (service) {
      secrets = secrets.filter(s => s.service === service);
    }

    if (environment) {
      secrets = secrets.filter(s => s.environment === environment);
    }

    return secrets.map(secret => ({
      ...secret,
      value: '***REDACTED***',
    }));
  }

  getSecretUsage(id: string): SecretAccess[] {
    return Array.from(this.accesses.values()).filter(access => access.secretId === id);
  }

  private recordAccess(secretId: string, service: string, environment: string): void {
    const access: SecretAccess = {
      id: randomUUID(),
      secretId,
      service,
      environment,
      accessedAt: Date.now(),
      ipAddress: 'unknown',
    };

    this.accesses.set(access.id, access);

    const secret = this.secrets.get(secretId);
    if (secret) {
      secret.usageCount = (secret.usageCount || 0) + 1;
      this.secrets.set(secretId, secret);
    }
  }

  getSecretStats(): {
    totalSecrets: number;
    activeSecrets: number;
    inactiveSecrets: number;
    secretsByType: Record<SecretType, number>;
    secretsByService: Record<string, number>;
  } {
    const secrets = Array.from(this.secrets.values());

    const stats = {
      totalSecrets: secrets.length,
      activeSecrets: secrets.filter(s => s.status === SecretStatus.ACTIVE).length,
      inactiveSecrets: secrets.filter(s => s.status === SecretStatus.INACTIVE).length,
      secretsByType: {} as Record<SecretType, number>,
      secretsByService: {} as Record<string, number>,
    };

    for (const secret of secrets) {
      stats.secretsByType[secret.type] = (stats.secretsByType[secret.type] || 0) + 1;
      if (secret.service) {
        stats.secretsByService[secret.service] = (stats.secretsByService[secret.service] || 0) + 1;
      }
    }

    return stats;
  }
}
