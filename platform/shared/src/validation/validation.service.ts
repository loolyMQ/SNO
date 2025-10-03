import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { z } from 'zod';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: unknown;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  type: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (_value: unknown) => boolean;
}

@injectable()
export class ValidationService {
  constructor(
    private _logger: LoggerService,
    private _metrics: MetricsService
  ) {
    this._logger.info('ValidationService initialized');
  }

  public validateEmail(email: string): ValidationResult {
    const emailSchema = z.string().email();
    
    try {
      const result = emailSchema.parse(email);
      this._metrics.incrementCounter('validation_success_total', { type: 'email' });
      return { isValid: true, errors: [], data: result };
    } catch (error) {
      const errors = error instanceof z.ZodError ? error.errors.map(e => e.message) : ['Invalid email format'];
      this._metrics.incrementCounter('validation_error_total', { type: 'email' });
      return { isValid: false, errors };
    }
  }

  public validatePassword(password: string): ValidationResult {
    const passwordSchema = z.string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');
    
    try {
      const result = passwordSchema.parse(password);
      this._metrics.incrementCounter('validation_success_total', { type: 'password' });
      return { isValid: true, errors: [], data: result };
    } catch (error) {
      const errors = error instanceof z.ZodError ? error.errors.map(e => e.message) : ['Invalid password format'];
      this._metrics.incrementCounter('validation_error_total', { type: 'password' });
      return { isValid: false, errors };
    }
  }

  public validateUUID(uuid: string): ValidationResult {
    const uuidSchema = z.string().uuid();
    
    try {
      const result = uuidSchema.parse(uuid);
      this._metrics.incrementCounter('validation_success_total', { type: 'uuid' });
      return { isValid: true, errors: [], data: result };
    } catch (error) {
      const errors = error instanceof z.ZodError ? error.errors.map(e => e.message) : ['Invalid UUID format'];
      this._metrics.incrementCounter('validation_error_total', { type: 'uuid' });
      return { isValid: false, errors };
    }
  }

  public validateObject<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult {
    try {
      const result = schema.parse(data);
      this._metrics.incrementCounter('validation_success_total', { type: 'object' });
      return { isValid: true, errors: [], data: result };
    } catch (error) {
      const errors = error instanceof z.ZodError ? error.errors.map(e => e.message) : ['Invalid object format'];
      this._metrics.incrementCounter('validation_error_total', { type: 'object' });
      return { isValid: false, errors };
    }
  }

  public validateArray<T>(data: unknown[], schema: z.ZodSchema<T>): ValidationResult {
    const arraySchema = z.array(schema);
    
    try {
      const result = arraySchema.parse(data);
      if (!result) {
        throw new Error('Array validation returned undefined');
      }
      this._metrics.incrementCounter('validation_success_total', { type: 'array' });
      return { isValid: true, errors: [], data: result };
    } catch (error) {
      const errors = error instanceof z.ZodError ? error.errors.map(e => e.message) : ['Invalid array format'];
      this._metrics.incrementCounter('validation_error_total', { type: 'array' });
      return { isValid: false, errors };
    }
  }

  public sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  public validateRequired(field: string, _value: unknown): ValidationResult {
    if (_value === null || _value === undefined || _value === '') {
      this._metrics.incrementCounter('validation_error_total', { type: 'required' });
      return { isValid: false, errors: [`${field} is required`] };
    }
    
    this._metrics.incrementCounter('validation_success_total', { type: 'required' });
    return { isValid: true, errors: [] };
  }

  public validateLength(field: string, _value: string, min: number, max: number): ValidationResult {
    if (_value.length < min) {
      this._metrics.incrementCounter('validation_error_total', { type: 'length' });
      return { isValid: false, errors: [`${field} must be at least ${min} characters long`] };
    }
    
    if (_value.length > max) {
      this._metrics.incrementCounter('validation_error_total', { type: 'length' });
      return { isValid: false, errors: [`${field} must be no more than ${max} characters long`] };
    }
    
    this._metrics.incrementCounter('validation_success_total', { type: 'length' });
    return { isValid: true, errors: [] };
  }

  public validatePattern(field: string, _value: string, pattern: RegExp): ValidationResult {
    if (!pattern.test(_value)) {
      this._metrics.incrementCounter('validation_error_total', { type: 'pattern' });
      return { isValid: false, errors: [`${field} format is invalid`] };
    }
    
    this._metrics.incrementCounter('validation_success_total', { type: 'pattern' });
    return { isValid: true, errors: [] };
  }
}
