import { Secret, SecretType, SecretRotation, SecretAccess, SecretPolicy } from './types';
export declare class SecretsEngine {
    private static instance;
    private manager;
    private validator;
    private encryption;
    private rotations;
    private policies;
    private logger;
    constructor();
    static getInstance(): SecretsEngine;
    createSecret(secret: Omit<Secret, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Secret;
    getSecret(id: string, service: string, environment: string): Secret | null;
    getSecretByName(name: string, service: string, environment: string): Secret | null;
    updateSecret(id: string, updates: Partial<Secret>): Secret | null;
    deleteSecret(id: string): boolean;
    listSecrets(service?: string, environment?: string): Secret[];
    getSecretUsage(id: string): SecretAccess[];
    getSecretStats(): {
        totalSecrets: number;
        activeSecrets: number;
        inactiveSecrets: number;
        secretsByType: Record<SecretType, number>;
        secretsByService: Record<string, number>;
    };
    validateSecret(secret: Secret): {
        valid: boolean;
        errors: string[];
    };
    addPolicy(policy: Omit<SecretPolicy, 'id' | 'createdAt' | 'updatedAt'>): SecretPolicy;
    getPolicy(id: string): SecretPolicy | null;
    getPolicyForType(type: SecretType): SecretPolicy | null;
    getAllPolicies(): SecretPolicy[];
    scheduleRotation(secretId: string, rotationConfig: {
        interval: number;
        autoRotate: boolean;
        notifyBefore: number;
    }): SecretRotation;
    getRotations(): SecretRotation[];
    getRotationsDue(): SecretRotation[];
    rotateSecret(secretId: string): Secret | null;
    generateSecretValue(type: SecretType): string;
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
    };
    getEncryptionInfo(): {
        algorithm: string;
        keyLength: number;
        ivLength: number;
        tagLength: number;
        hasKey: boolean;
    };
    rotateEncryptionKey(): string;
}
//# sourceMappingURL=engine.d.ts.map