// import crypto from 'crypto'; // Not used in this file
import bcrypt from 'bcrypt';
import { PasswordValidator, PasswordPolicy } from '../validation/password-validator';

export class SecurePasswordManager {
  public static generateSecurePassword(length: number = 16): string {
    if (length < 8) {
      throw new Error('Password length must be at least 8 characters');
    }

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

  public static validatePassword(password: string, policy?: PasswordPolicy) {
    return PasswordValidator.validatePassword(password, policy);
  }

  public static async hashPassword(password: string, rounds: number = 12): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateEnvironmentPasswords(): {
    admin: string;
    user: string;
    moderator: string;
    database: string;
    redis: string;
    jwt: string;
    grafana: string;
    smtp: string;
    meilisearch: string;
  } {
    return {
      admin: this.generateSecurePassword(16),
      user: this.generateSecurePassword(16),
      moderator: this.generateSecurePassword(16),
      database: this.generateSecurePassword(24),
      redis: this.generateSecurePassword(16),
      jwt: this.generateSecurePassword(64),
      grafana: this.generateSecurePassword(16),
      smtp: this.generateSecurePassword(16),
      meilisearch: this.generateSecurePassword(32),
    };
  }

  public static maskPassword(password: string): string {
    if (password.length <= 4) {
      return '*'.repeat(password.length);
    }
    return (
      password.substring(0, 2) +
      '*'.repeat(password.length - 4) +
      password.substring(password.length - 2)
    );
  }

  public static isPasswordSecure(password: string, policy?: PasswordPolicy): boolean {
    return PasswordValidator.isPasswordSecure(password, policy);
  }

  public static getPasswordStrength(password: string) {
    return PasswordValidator.getPasswordStrength(password);
  }
}
