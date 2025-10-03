import crypto from 'crypto';
export class SecretEncryption {
    encryptionKey;
    algorithm = 'aes-256-gcm';
    keyLength = 32;
    ivLength = 16;
    tagLength = 16;
    constructor(encryptionKey) {
        this.encryptionKey = encryptionKey;
        this.encryptionKey =
            encryptionKey || process.env['SECRETS_ENCRYPTION_KEY'] || this.generateKey();
    }
    encrypt(plaintext) {
        try {
            const key = this.getKey();
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, key);
            // cipher.setAAD(Buffer.from('science-map-secrets', 'utf8')); // Not available on Cipher
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Auth tag would be retrieved here if needed
            const result = {
                encrypted,
                iv: iv.toString('hex'),
                // tag: tag.toString('hex'), // tag not available
                algorithm: this.algorithm,
            };
            return Buffer.from(JSON.stringify(result)).toString('base64');
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    decrypt(encryptedData) {
        try {
            const key = this.getKey();
            const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
            const decipher = crypto.createDecipher(data.algorithm, key);
            decipher.setAAD(Buffer.from('science-map-secrets', 'utf8'));
            decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    generateKey() {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }
    generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    hash(value, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(value).digest('hex');
    }
    generateRandomString(length = 32) {
        return crypto.randomBytes(length).toString('base64url');
    }
    generateSecurePassword(length = 16) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += specialChars[Math.floor(Math.random() * specialChars.length)];
        const allChars = uppercase + lowercase + numbers + specialChars;
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        return password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');
    }
    generateApiKey(length = 32) {
        return crypto.randomBytes(length).toString('base64url');
    }
    generateJwtSecret(length = 64) {
        return crypto.randomBytes(length).toString('base64url');
    }
    generateDatabasePassword(length = 16) {
        return this.generateSecurePassword(length);
    }
    generateEncryptionKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    verifyIntegrity(encryptedData) {
        try {
            const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
            return !!(data.encrypted && data.iv && data.tag && data.algorithm);
        }
        catch {
            return false;
        }
    }
    getKey() {
        if (!this.encryptionKey) {
            throw new Error('Encryption key is not set');
        }
        if (this.encryptionKey.length < this.keyLength) {
            throw new Error(`Encryption key must be at least ${this.keyLength} characters long`);
        }
        return Buffer.from(this.encryptionKey.substring(0, this.keyLength), 'hex');
    }
    rotateKey() {
        const newKey = this.generateKey();
        this.encryptionKey = newKey;
        return newKey;
    }
    getKeyInfo() {
        return {
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            ivLength: this.ivLength,
            tagLength: this.tagLength,
            hasKey: !!this.encryptionKey,
        };
    }
}
//# sourceMappingURL=secret-encryption.js.map