import crypto from 'crypto';

export class SecretEncryption {
  private algorithm: string = 'aes-256-gcm';
  private keyLength: number = 32;
  private ivLength: number = 16;
  private tagLength: number = 16;

  constructor(private encryptionKey?: string) {
    this.encryptionKey =
      encryptionKey || process.env['SECRETS_ENCRYPTION_KEY'] || this.generateKey();
  }

  encrypt(plaintext: string): string {
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);
      // cipher.setAAD(Buffer.from('science-map-secrets', 'utf8')); // Not available on Cipher

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // const tag = cipher.getAuthTag(); // Not available on Cipher

      const result = {
        encrypted,
        iv: iv.toString('hex'),
        // tag: tag.toString('hex'), // tag not available
        algorithm: this.algorithm,
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const key = this.getKey();
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));

      const decipher = crypto.createDecipher(data.algorithm, key);
      decipher.setAAD(Buffer.from('science-map-secrets', 'utf8'));
      decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  generateSecureKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hash(value: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(value).digest('hex');
  }

  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  generateSecurePassword(length: number = 16): string {
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

  generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  generateJwtSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  generateDatabasePassword(length: number = 16): string {
    return this.generateSecurePassword(length);
  }

  generateEncryptionKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  verifyIntegrity(encryptedData: string): boolean {
    try {
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      return !!(data.encrypted && data.iv && data.tag && data.algorithm);
    } catch {
      return false;
    }
  }

  private getKey(): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key is not set');
    }

    if (this.encryptionKey.length < this.keyLength) {
      throw new Error(`Encryption key must be at least ${this.keyLength} characters long`);
    }

    return Buffer.from(this.encryptionKey.substring(0, this.keyLength), 'hex');
  }

  rotateKey(): string {
    const newKey = this.generateKey();
    this.encryptionKey = newKey;
    return newKey;
  }

  getKeyInfo(): {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    hasKey: boolean;
  } {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      hasKey: !!this.encryptionKey,
    };
  }
}
