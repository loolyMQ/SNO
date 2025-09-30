import { Secret, SecretType, SecretRotation, SecretAccess, SecretPolicy } from './types';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { SecretManager } from './secret-manager';
import { SecretValidator } from './secret-validator';
import { SecretEncryption } from './secret-encryption';
import { LoggerFactory } from '../logging';

export class SecretsEngine {
  private static instance: SecretsEngine;
  private manager: SecretManager;
  private validator: SecretValidator;
  private encryption: SecretEncryption;
  private rotations: Map<string, SecretRotation> = new Map();
  private policies: Map<string, SecretPolicy> = new Map();
  private logger: pino.Logger;

  constructor() {
    this.logger = LoggerFactory.createServiceLogger('secrets-engine');

    this.manager = new SecretManager(this.logger);
    this.validator = new SecretValidator();
    this.encryption = new SecretEncryption();
  }

  static getInstance(): SecretsEngine {
    if (!SecretsEngine.instance) {
      SecretsEngine.instance = new SecretsEngine();
    }
    return SecretsEngine.instance;
  }

  createSecret(secret: Omit<Secret, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Secret {
    return this.manager.createSecret(secret);
  }

  getSecret(id: string, service: string, environment: string): Secret | null {
    return this.manager.getSecret(id, service, environment);
  }

  getSecretByName(name: string, service: string, environment: string): Secret | null {
    return this.manager.getSecretByName(name, service, environment);
  }

  updateSecret(id: string, updates: Partial<Secret>): Secret | null {
    return this.manager.updateSecret(id, updates);
  }

  deleteSecret(id: string): boolean {
    return this.manager.deleteSecret(id);
  }

  listSecrets(service?: string, environment?: string): Secret[] {
    return this.manager.listSecrets(service, environment);
  }

  getSecretUsage(id: string): SecretAccess[] {
    return this.manager.getSecretUsage(id);
  }

  getSecretStats(): {
    totalSecrets: number;
    activeSecrets: number;
    inactiveSecrets: number;
    secretsByType: Record<SecretType, number>;
    secretsByService: Record<string, number>;
  } {
    return this.manager.getSecretStats();
  }

  validateSecret(secret: Secret): { valid: boolean; errors: string[] } {
    const policy = this.getPolicyForType(secret.type);
    return this.validator.validateSecretAgainstPolicy(secret, policy || ({} as SecretPolicy));
  }

  addPolicy(policy: Omit<SecretPolicy, 'id' | 'createdAt' | 'updatedAt'>): SecretPolicy {
    const newPolicy: SecretPolicy = {
      ...policy,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.policies.set(newPolicy.id, newPolicy);
    this.logger.info({ policyId: newPolicy.id, name: newPolicy.name }, 'Secret policy created');

    return newPolicy;
  }

  getPolicy(id: string): SecretPolicy | null {
    return this.policies.get(id) || null;
  }

  getPolicyForType(type: SecretType): SecretPolicy | null {
    const policy = Array.from(this.policies.values()).find(p => (p as any).type === type);

    return policy || this.validator.getPolicyForType(type);
  }

  getAllPolicies(): SecretPolicy[] {
    return Array.from(this.policies.values());
  }

  scheduleRotation(
    secretId: string,
    rotationConfig: {
      interval: number;
      autoRotate: boolean;
      notifyBefore: number;
    }
  ): SecretRotation {
    const rotation: SecretRotation = {
      id: randomUUID(),
      secretId,
      oldValue: '', // Required field
      newValue: '', // Required field
      rotatedAt: Date.now(), // Required field
      rotatedBy: 'system', // Required field
      reason: 'Initial rotation setup', // Required field
      autoRotate: rotationConfig.autoRotate,
      notifyBefore: rotationConfig.notifyBefore,
      lastRotated: Date.now(),
      nextRotation: Date.now() + rotationConfig.interval,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rotations.set(rotation.id, rotation);
    this.logger.info({ rotationId: rotation.id, secretId }, 'Secret rotation scheduled');

    return rotation;
  }

  getRotations(): SecretRotation[] {
    return Array.from(this.rotations.values());
  }

  getRotationsDue(): SecretRotation[] {
    const now = Date.now();
    return Array.from(this.rotations.values()).filter(rotation => {
      // Since nextRotation is not in SecretRotation interface, we'll use a different approach
      // For now, return all rotations that need to be checked
      return rotation.autoRotate && now - rotation.lastRotated > 24 * 60 * 60 * 1000; // 24 hours
    });
  }

  rotateSecret(secretId: string): Secret | null {
    const secret = this.manager.getSecret(secretId, 'system', 'system');
    if (!secret) {
      return null;
    }

    const newValue = this.generateSecretValue(secret.type);
    const updatedSecret = this.manager.updateSecret(secretId, { value: newValue });

    if (updatedSecret) {
      const rotation = Array.from(this.rotations.values()).find(r => r.secretId === secretId);

      if (rotation) {
        rotation.lastRotated = Date.now();
        // rotation.nextRotation = Date.now() + rotation.interval; // nextRotation not in interface
        this.rotations.set(rotation.id, rotation);
      }

      this.logger.info({ secretId }, 'Secret rotated successfully');
    }

    return updatedSecret;
  }

  generateSecretValue(type: SecretType): string {
    switch (type) {
      case 'password':
        return this.encryption.generateSecurePassword(16);
      case 'api_key':
        return this.encryption.generateApiKey(32);
      case 'jwt_secret':
        return this.encryption.generateJwtSecret(64);
      case SecretType.DATABASE_URL:
        return this.encryption.generateDatabasePassword(16);
      case 'encryption_key':
        return this.encryption.generateEncryptionKey(32);
      default:
        return this.encryption.generateRandomString(32);
    }
  }

  generateEnvironmentSecrets(): {
    admin: string;
    user: string;
    moderator: string;
    database: string;
    redis: string;
    jwt: string;
    grafana: string;
    smtp: string;
    meilisearch: string;
  } {
    return {
      admin: this.encryption.generateSecurePassword(16),
      user: this.encryption.generateSecurePassword(16),
      moderator: this.encryption.generateSecurePassword(16),
      database: this.encryption.generateDatabasePassword(24),
      redis: this.encryption.generateSecurePassword(16),
      jwt: this.encryption.generateJwtSecret(64),
      grafana: this.encryption.generateSecurePassword(16),
      smtp: this.encryption.generateSecurePassword(16),
      meilisearch: this.encryption.generateApiKey(32),
    };
  }

  getEncryptionInfo(): {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    hasKey: boolean;
  } {
    return this.encryption.getKeyInfo();
  }

  rotateEncryptionKey(): string {
    return this.encryption.rotateKey();
  }
}
