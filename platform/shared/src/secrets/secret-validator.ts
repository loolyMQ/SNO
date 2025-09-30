import { Secret, SecretType, SecretPolicy } from './types';
import { PasswordValidator } from '../validation/password-validator';

export class SecretValidator {
  validateSecret(secret: Partial<Secret>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!secret.name || secret.name.trim().length === 0) {
      errors.push('Secret name is required');
    }

    if (!secret.value || secret.value.trim().length === 0) {
      errors.push('Secret value is required');
    }

    if (!secret.type) {
      errors.push('Secret type is required');
    }

    if (!secret.service || secret.service.trim().length === 0) {
      errors.push('Secret service is required');
    }

    if (!secret.environment || secret.environment.trim().length === 0) {
      errors.push('Secret environment is required');
    }

    if (secret.value && secret.value.length < 8) {
      errors.push('Secret value must be at least 8 characters long');
    }

    if (secret.name && secret.name.length > 100) {
      errors.push('Secret name must be less than 100 characters');
    }

    if (secret.description && secret.description.length > 500) {
      errors.push('Secret description must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateSecretAgainstPolicy(
    secret: Secret,
    policy: SecretPolicy
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const value = secret.value;

    if (!policy) {
      return { valid: true, errors: [] };
    }

    const rules = policy.rules;

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Password must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Password must be no more than ${rules.maxLength} characters`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(value)) {
      errors.push('Password must contain uppercase letters');
    }

    if (rules.requireLowercase && !/[a-z]/.test(value)) {
      errors.push('Password must contain lowercase letters');
    }

    if (rules.requireNumbers && !/\d/.test(value)) {
      errors.push('Password must contain numbers');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('Password must contain special characters');
    }

    if (rules.forbiddenPatterns) {
      for (const pattern of rules.forbiddenPatterns) {
        if (new RegExp(pattern).test(value)) {
          errors.push(`Password contains forbidden pattern: ${pattern}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateSecretName(name: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Secret name is required');
    }

    if (name.length > 100) {
      errors.push('Secret name must be less than 100 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push('Secret name can only contain letters, numbers, underscores, and hyphens');
    }

    if (name.startsWith('-') || name.endsWith('-')) {
      errors.push('Secret name cannot start or end with a hyphen');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateSecretValue(
    value: string,
    type: SecretType
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!value || value.trim().length === 0) {
      errors.push('Secret value is required');
    }

    if (value.length < 8) {
      errors.push('Secret value must be at least 8 characters long');
    }

    if (value.length > 1000) {
      errors.push('Secret value must be less than 1000 characters');
    }

    switch (type) {
      case 'password':
        const passwordValidation = PasswordValidator.validatePassword(value);
        if (!passwordValidation.isValid) {
          errors.push(...passwordValidation.errors);
        }
        break;

      case 'api_key':
        const apiKeyPolicy = PasswordValidator.createApiKeyPolicy();
        const apiKeyValidation = PasswordValidator.validatePassword(value, apiKeyPolicy);
        if (!apiKeyValidation.isValid) {
          errors.push(...apiKeyValidation.errors);
        }
        break;

      case 'jwt_secret':
        const jwtPolicy = PasswordValidator.createJwtSecretPolicy();
        const jwtValidation = PasswordValidator.validatePassword(value, jwtPolicy);
        if (!jwtValidation.isValid) {
          errors.push(...jwtValidation.errors);
        }
        break;

      case SecretType.DATABASE_URL:
        const dbPolicy = PasswordValidator.createDatabasePasswordPolicy();
        const dbValidation = PasswordValidator.validatePassword(value, dbPolicy);
        if (!dbValidation.isValid) {
          errors.push(...dbValidation.errors);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getPolicyForType(type: SecretType): SecretPolicy | null {
    const policies: Record<SecretType, SecretPolicy> = {
      password: {
        id: 'password-policy',
        name: 'Password Policy',
        description: 'Password validation policy',
        rules: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          forbiddenPatterns: ['password', '123456', 'admin', 'user'],
        },
        appliesTo: [SecretType.PASSWORD],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      api_key: {
        id: 'api-key-policy',
        name: 'API Key Policy',
        description: 'API Key validation policy',
        rules: {
          minLength: 32,
          maxLength: 256,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: true,
          requireSpecialChars: false,
          forbiddenPatterns: [],
        },
        appliesTo: [SecretType.API_KEY],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      jwt_secret: {
        id: 'jwt-secret-policy',
        name: 'JWT Secret Policy',
        description: 'JWT Secret validation policy',
        rules: {
          minLength: 64,
          maxLength: 512,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: true,
          requireSpecialChars: true,
          forbiddenPatterns: [],
        },
        appliesTo: [SecretType.JWT_SECRET],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      [SecretType.DATABASE_URL]: {
        id: 'database-password-policy',
        name: 'Database Password Policy',
        description: 'Database password validation policy',
        rules: {
          minLength: 16,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          forbiddenPatterns: ['password', 'admin', 'root', 'test'],
        },
        appliesTo: [SecretType.DATABASE_URL],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      encryption_key: {
        id: 'encryption-key-policy',
        name: 'Encryption Key Policy',
        description: 'Encryption key validation policy',
        rules: {
          minLength: 32,
          maxLength: 256,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: true,
          requireSpecialChars: false,
          forbiddenPatterns: [],
        },
        appliesTo: [SecretType.ENCRYPTION_KEY],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      [SecretType.CERTIFICATE]: {
        id: 'certificate-policy',
        name: 'Certificate Policy',
        description: 'Certificate validation policy',
        rules: {
          minLength: 100,
          maxLength: 10000,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          forbiddenPatterns: [],
        },
        appliesTo: [SecretType.CERTIFICATE],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      [SecretType.SSH_KEY]: {
        id: 'ssh-key-policy',
        name: 'SSH Key Policy',
        description: 'SSH Key validation policy',
        rules: {
          minLength: 100,
          maxLength: 10000,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
          forbiddenPatterns: [],
        },
        appliesTo: [SecretType.SSH_KEY],
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    return policies[type] || null;
  }
}
