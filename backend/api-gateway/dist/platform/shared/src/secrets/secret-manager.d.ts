import { Secret, SecretType, SecretAccess } from './types';
import pino from 'pino';
export declare class SecretManager {
    private secrets;
    private accesses;
    private encryption;
    private validator;
    private logger;
    constructor(logger: pino.Logger);
    createSecret(secret: Omit<Secret, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Secret;
    getSecret(id: string, service: string, environment: string): Secret | null;
    getSecretByName(name: string, service: string, environment: string): Secret | null;
    updateSecret(id: string, updates: Partial<Secret>): Secret | null;
    deleteSecret(id: string): boolean;
    listSecrets(service?: string, environment?: string): Secret[];
    getSecretUsage(id: string): SecretAccess[];
    private recordAccess;
    getSecretStats(): {
        totalSecrets: number;
        activeSecrets: number;
        inactiveSecrets: number;
        secretsByType: Record<SecretType, number>;
        secretsByService: Record<string, number>;
    };
}
//# sourceMappingURL=secret-manager.d.ts.map