export declare class SecretEncryption {
    private encryptionKey?;
    private algorithm;
    private keyLength;
    private ivLength;
    private tagLength;
    constructor(encryptionKey?: string | undefined);
    encrypt(plaintext: string): string;
    decrypt(encryptedData: string): string;
    generateKey(): string;
    generateSecureKey(length?: number): string;
    hash(value: string, algorithm?: string): string;
    generateRandomString(length?: number): string;
    generateSecurePassword(length?: number): string;
    generateApiKey(length?: number): string;
    generateJwtSecret(length?: number): string;
    generateDatabasePassword(length?: number): string;
    generateEncryptionKey(length?: number): string;
    verifyIntegrity(encryptedData: string): boolean;
    private getKey;
    rotateKey(): string;
    getKeyInfo(): {
        algorithm: string;
        keyLength: number;
        ivLength: number;
        tagLength: number;
        hasKey: boolean;
    };
}
//# sourceMappingURL=secret-encryption.d.ts.map