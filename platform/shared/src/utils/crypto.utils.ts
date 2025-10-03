import * as crypto from 'crypto';

export class CryptoUtils {
  static generateRandomBytes(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateUuid(): string {
    return crypto.randomUUID();
  }

  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static hashBuffer(data: Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static hmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static hmacBuffer(data: Buffer, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static encrypt(text: string, key: string, algorithm: string = 'aes-256-cbc'): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string, key: string, algorithm: string = 'aes-256-cbc'): string {
    if (!encryptedText) {
      throw new Error('Encrypted text is required');
    }
    if (!key) {
      throw new Error('Key is required');
    }
    const textParts = encryptedText.split(':');
    textParts.shift(); // Remove IV from the beginning
    const encryptedData = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static encryptWithIv(text: string, key: string, iv: Buffer, algorithm: string = 'aes-256-cbc'): string {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptWithIv(encryptedText: string, key: string, iv: Buffer, algorithm: string = 'aes-256-cbc'): string {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateKeyPair(type: 'rsa' | 'ec' = 'rsa', options?: unknown): {
    publicKey: string;
    privateKey: string;
  } {
    const keyPair = type === 'rsa' 
      ? crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          },
          ...(options as Record<string, unknown>)
        })
      : crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          },
          ...(options as Record<string, unknown>)
        });

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  static sign(data: string, privateKey: string, algorithm: string = 'RSA-SHA256'): string {
    const sign = crypto.createSign(algorithm);
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  static verify(data: string, signature: string, publicKey: string, algorithm: string = 'RSA-SHA256'): boolean {
    const verify = crypto.createVerify(algorithm);
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }

  static createHash(algorithm: string = 'sha256'): crypto.Hash {
    return crypto.createHash(algorithm);
  }

  static createHmac(algorithm: string, key: string): crypto.Hmac {
    return crypto.createHmac(algorithm, key);
  }

  static createCipher(algorithm: string, key: string): crypto.Cipher {
    return crypto.createCipher(algorithm, key);
  }

  static createDecipher(algorithm: string, key: string): crypto.Decipher {
    return crypto.createDecipher(algorithm, key);
  }

  static createCipheriv(algorithm: string, key: string, iv: Buffer): crypto.Cipher {
    return crypto.createCipheriv(algorithm, key, iv);
  }

  static createDecipheriv(algorithm: string, key: string, iv: Buffer): crypto.Decipher {
    return crypto.createDecipheriv(algorithm, key, iv);
  }

  static createSign(algorithm: string): crypto.Sign {
    return crypto.createSign(algorithm);
  }

  static createVerify(algorithm: string): crypto.Verify {
    return crypto.createVerify(algorithm);
  }

  static pbkdf2(password: string, salt: string, iterations: number = 100000, keylen: number = 64, digest: string = 'sha512'): string {
    return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  }

  static scrypt(password: string, salt: string, keylen: number = 64, options?: crypto.ScryptOptions): string {
    return crypto.scryptSync(password, salt, keylen, options).toString('hex');
  }

  static timingSafeEqual(a: Buffer, b: Buffer): boolean {
    return crypto.timingSafeEqual(a, b);
  }

  static getCiphers(): string[] {
    return crypto.getCiphers();
  }

  static getHashes(): string[] {
    return crypto.getHashes();
  }

  static getCurves(): string[] {
    return crypto.getCurves();
  }

  static getFips(): boolean {
    return Boolean(crypto.getFips());
  }

  static setFips(fips: boolean): void {
    crypto.setFips(fips);
  }

  static randomFillSync(buffer: Buffer, offset?: number, size?: number): Buffer {
    return crypto.randomFillSync(buffer, offset, size);
  }

  static randomFill(buffer: Buffer, offsetOrCallback?: number | ((_err: Error | null, _buf: Buffer) => void), sizeOrCallback?: number | ((_err: Error | null, _buf: Buffer) => void), callback?: (_err: Error | null, _buf: Buffer) => void): void {
    return crypto.randomFill(buffer, offsetOrCallback as number, sizeOrCallback as number, callback as (_err: Error | null, _buf: Buffer) => void);
  }

  static randomInt(min: number, max: number): number {
    return crypto.randomInt(min, max);
  }

  static randomUUID(): string {
    return crypto.randomUUID();
  }

  static webcrypto(): crypto.webcrypto.Crypto {
    return crypto.webcrypto;
  }
}
