import { AuthService } from '../../services/AuthService';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: '123', email: 'test@example.com' }),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('generateToken', () => {
    it('should generate a JWT token for valid user', () => {
      const user = { id: '123', email: 'test@example.com' };
      const token = authService.generateToken(user);
      
      expect(token).toBe('mock-jwt-token');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid JWT token', () => {
      const token = 'valid-token';
      const decoded = authService.verifyToken(token);
      
      expect(decoded).toEqual({ userId: '123', email: 'test@example.com' });
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'plain-password';
      const hashed = await authService.hashPassword(password);
      
      expect(hashed).toBe('hashed-password');
    });
  });

  describe('comparePassword', () => {
    it('should compare password with hash', async () => {
      const password = 'plain-password';
      const hash = 'hashed-password';
      const isValid = await authService.comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        expect(authService.validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com'
      ];

      invalidEmails.forEach(email => {
        expect(authService.validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng#Pass',
        'ComplexP@ssw0rd'
      ];

      strongPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result).toBe(true);
      });
    });

    it('should reject weak password', () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        'Pass123',
        'Password!'
      ];

      weakPasswords.forEach(password => {
        expect(authService.validatePassword(password)).toBe(false);
      });
    });
  });
});
