export declare enum SecretType {
    PASSWORD = "password",
    API_KEY = "api_key",
    JWT_SECRET = "jwt_secret",
    DATABASE_URL = "database_url",
    ENCRYPTION_KEY = "encryption_key",
    CERTIFICATE = "certificate",
    SSH_KEY = "ssh_key"
}
export declare enum SecretStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    EXPIRED = "expired",
    REVOKED = "revoked",
    PENDING = "pending"
}
export interface Secret {
    id: string;
    name: string;
    type: SecretType;
    value: string;
    status: SecretStatus;
    description?: string;
    tags?: string[];
    expiresAt?: number;
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    lastUsedAt?: number;
    usageCount: number;
    service?: string;
    environment?: string;
}
export interface SecretRotation {
    id: string;
    secretId: string;
    oldValue: string;
    newValue: string;
    rotatedAt: number;
    rotatedBy: string;
    reason: string;
    autoRotate: boolean;
    lastRotated: number;
    nextRotation?: number;
    notifyBefore?: number;
    createdAt: number;
    updatedAt: number;
}
export interface SecretAccess {
    id: string;
    secretId: string;
    service: string;
    environment: string;
    accessedAt: number;
    ipAddress?: string;
    userAgent?: string;
}
export interface SecretPolicy {
    id: string;
    name: string;
    description: string;
    rules: {
        minLength?: number;
        maxLength?: number;
        requireUppercase?: boolean;
        requireLowercase?: boolean;
        requireNumbers?: boolean;
        requireSpecialChars?: boolean;
        forbiddenPatterns?: string[];
        maxAge?: number;
        rotationInterval?: number;
    };
    appliesTo: SecretType[];
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}
//# sourceMappingURL=types.d.ts.map