import { randomBytes, createHash, createHmac } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateRandomString(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function hashString(input: string, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(input).digest('hex');
}

export function createHmacSignature(data: string, secret: string, algorithm: string = 'sha256'): string {
  return createHmac(algorithm, secret).update(data).digest('hex');
}

export function generateApiKey(): string {
  const prefix = 'sk_';
  const randomPart = generateRandomString(32);
  return `${prefix}${randomPart}`;
}

export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${generateRandomString(8)}`;
}
