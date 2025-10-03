import { z } from 'zod';

export class ValidationUtils {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  }

  static validateUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!password || !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateJson(jsonString: string): {
    isValid: boolean;
    data?: unknown;
    error?: string;
  } {
    try {
      const data = JSON.parse(jsonString);
      return {
        isValid: true,
        data
      };
    } catch (error) {
      return {
        isValid: false,
        error: (error as Error).message
      };
    }
  }

  static validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): {
    isValid: boolean;
    data?: T;
    errors?: string[];
  } {
    try {
      if (!data) {
        throw new Error('Data is required');
      }
      const result = schema.parse(data);
      return {
        isValid: true,
        data: result
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => e.message)
        };
      }
      return {
        isValid: false,
        errors: [(error as Error).message]
      };
    }
  }

  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  static sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');
  }

  static validateRequired(value: unknown, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        error: `${fieldName} is required`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateLength(value: string, min: number, max: number, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (value.length < min) {
      return {
        isValid: false,
        error: `${fieldName} must be at least ${min} characters long`
      };
    }
    
    if (value.length > max) {
      return {
        isValid: false,
        error: `${fieldName} must be no more than ${max} characters long`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validatePattern(value: string, pattern: RegExp, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!pattern.test(value)) {
      return {
        isValid: false,
        error: `${fieldName} format is invalid`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateRange(value: number, min: number, max: number, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (value < min) {
      return {
        isValid: false,
        error: `${fieldName} must be at least ${min}`
      };
    }
    
    if (value > max) {
      return {
        isValid: false,
        error: `${fieldName} must be no more than ${max}`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateArrayLength(value: unknown[], min: number, max: number, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!value) {
      throw new Error('Array is required');
    }
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    if (value.length < min) {
      return {
        isValid: false,
        error: `${fieldName} must have at least ${min} items`
      };
    }
    
    if (value.length > max) {
      return {
        isValid: false,
        error: `${fieldName} must have no more than ${max} items`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateDateRange(startDate: Date, endDate: Date, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!startDate) {
      throw new Error('Start date is required');
    }
    if (!endDate) {
      throw new Error('End date is required');
    }
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    if (startDate >= endDate) {
      return {
        isValid: false,
        error: `${fieldName} start date must be before end date`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateFileSize(size: number, maxSize: number, fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (typeof size !== 'number') {
      throw new Error('Size must be a number');
    }
    if (typeof maxSize !== 'number') {
      throw new Error('Max size must be a number');
    }
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    if (size > maxSize) {
      return {
        isValid: false,
        error: `${fieldName} size must be no more than ${maxSize} bytes`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateFileType(filename: string, allowedTypes: string[], fieldName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!filename) {
      throw new Error('Filename is required');
    }
    if (!allowedTypes || !Array.isArray(allowedTypes)) {
      throw new Error('Allowed types must be an array');
    }
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedTypes.includes(extension)) {
      return {
        isValid: false,
        error: `${fieldName} must be one of: ${allowedTypes.join(', ')}`
      };
    }
    
    return {
      isValid: true
    };
  }

  static validateCreditCard(cardNumber: string): {
    isValid: boolean;
    type?: string;
    error?: string;
  } {
    if (!cardNumber) {
      throw new Error('Card number is required');
    }
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return {
        isValid: false,
        error: 'Invalid credit card number format'
      };
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i] || '0');
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      return {
        isValid: false,
        error: 'Invalid credit card number'
      };
    }
    
    // Determine card type
    let type = 'unknown';
    if (/^4/.test(cleanNumber)) {
      type = 'visa';
    } else if (/^5[1-5]/.test(cleanNumber)) {
      type = 'mastercard';
    } else if (/^3[47]/.test(cleanNumber)) {
      type = 'amex';
    } else if (/^6/.test(cleanNumber)) {
      type = 'discover';
    }
    
    return {
      isValid: true,
      type
    };
  }
}
