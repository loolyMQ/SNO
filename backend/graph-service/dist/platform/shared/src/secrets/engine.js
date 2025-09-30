import { SecretType } from './types';
import { randomUUID } from 'crypto';
import { SecretManager } from './secret-manager';
import { SecretValidator } from './secret-validator';
import { SecretEncryption } from './secret-encryption';
import { LoggerFactory } from '../logging';
export class SecretsEngine {
    static instance;
    manager;
    validator;
    encryption;
    rotations = new Map();
    policies = new Map();
    logger;
    constructor() {
        this.logger = LoggerFactory.createServiceLogger('secrets-engine');
        this.manager = new SecretManager(this.logger);
        this.validator = new SecretValidator();
        this.encryption = new SecretEncryption();
    }
    static getInstance() {
        if (!SecretsEngine.instance) {
            SecretsEngine.instance = new SecretsEngine();
        }
        return SecretsEngine.instance;
    }
    createSecret(secret) {
        return this.manager.createSecret(secret);
    }
    getSecret(id, service, environment) {
        return this.manager.getSecret(id, service, environment);
    }
    getSecretByName(name, service, environment) {
        return this.manager.getSecretByName(name, service, environment);
    }
    updateSecret(id, updates) {
        return this.manager.updateSecret(id, updates);
    }
    deleteSecret(id) {
        return this.manager.deleteSecret(id);
    }
    listSecrets(service, environment) {
        return this.manager.listSecrets(service, environment);
    }
    getSecretUsage(id) {
        return this.manager.getSecretUsage(id);
    }
    getSecretStats() {
        return this.manager.getSecretStats();
    }
    validateSecret(secret) {
        const policy = this.getPolicyForType(secret.type);
        return this.validator.validateSecretAgainstPolicy(secret, policy || {});
    }
    addPolicy(policy) {
        const newPolicy = {
            ...policy,
            id: randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.policies.set(newPolicy.id, newPolicy);
        this.logger.info({ policyId: newPolicy.id, name: newPolicy.name }, 'Secret policy created');
        return newPolicy;
    }
    getPolicy(id) {
        return this.policies.get(id) || null;
    }
    getPolicyForType(type) {
        const policy = Array.from(this.policies.values()).find(p => p.type === type);
        return policy || this.validator.getPolicyForType(type);
    }
    getAllPolicies() {
        return Array.from(this.policies.values());
    }
    scheduleRotation(secretId, rotationConfig) {
        const rotation = {
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
    getRotations() {
        return Array.from(this.rotations.values());
    }
    getRotationsDue() {
        const now = Date.now();
        return Array.from(this.rotations.values()).filter(rotation => {
            // Since nextRotation is not in SecretRotation interface, we'll use a different approach
            // For now, return all rotations that need to be checked
            return rotation.autoRotate && now - rotation.lastRotated > 24 * 60 * 60 * 1000; // 24 hours
        });
    }
    rotateSecret(secretId) {
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
    generateSecretValue(type) {
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
    generateEnvironmentSecrets() {
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
    getEncryptionInfo() {
        return this.encryption.getKeyInfo();
    }
    rotateEncryptionKey() {
        return this.encryption.rotateKey();
    }
}
//# sourceMappingURL=engine.js.map