import {
  isValidEmail,
  isValidUUID,
  isValidUrl,
  sanitizeString,
  validatePagination,
} from './validation';

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/users')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize strings', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString('test<script>alert("xss")</script>')).toBe(
        'testscriptalert("xss")/script',
      );
    });
  });

  describe('validatePagination', () => {
    it('should validate pagination parameters', () => {
      expect(validatePagination(1, 10)).toEqual({ page: 1, limit: 10 });
      expect(validatePagination(0, 0)).toEqual({ page: 1, limit: 1 });
      expect(validatePagination(5, 200)).toEqual({ page: 5, limit: 100 });
    });
  });
});
