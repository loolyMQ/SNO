import { SecretStatus } from './types';
import { randomUUID } from 'crypto';
import { SecretEncryption } from './secret-encryption';
import { SecretValidator } from './secret-validator';
export class SecretManager {
    secrets = new Map();
    accesses = new Map();
    encryption;
    validator;
    logger;
    constructor(logger) {
        this.logger = logger;
        this.encryption = new SecretEncryption();
        this.validator = new SecretValidator();
    }
    createSecret(secret) {
        const validation = this.validator.validateSecret(secret);
        if (!validation.isValid) {
            throw new Error(`Secret validation failed: ${validation.errors.join(', ')}`);
        }
        const newSecret = {
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
    getSecret(id, service, environment) {
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
    getSecretByName(name, service, environment) {
        const secret = Array.from(this.secrets.values()).find(s => s.name === name && s.status === SecretStatus.ACTIVE);
        if (!secret) {
            return null;
        }
        return this.getSecret(secret.id, service, environment);
    }
    updateSecret(id, updates) {
        const existing = this.secrets.get(id);
        if (!existing) {
            return null;
        }
        const updated = {
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
    deleteSecret(id) {
        const secret = this.secrets.get(id);
        if (!secret) {
            return false;
        }
        this.secrets.delete(id);
        this.logger.info({ secretId: id }, 'Secret deleted');
        return true;
    }
    listSecrets(service, environment) {
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
    getSecretUsage(id) {
        return Array.from(this.accesses.values()).filter(access => access.secretId === id);
    }
    recordAccess(secretId, service, environment) {
        const access = {
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
    getSecretStats() {
        const secrets = Array.from(this.secrets.values());
        const stats = {
            totalSecrets: secrets.length,
            activeSecrets: secrets.filter(s => s.status === SecretStatus.ACTIVE).length,
            inactiveSecrets: secrets.filter(s => s.status === SecretStatus.INACTIVE).length,
            secretsByType: {},
            secretsByService: {},
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
//# sourceMappingURL=secret-manager.js.map