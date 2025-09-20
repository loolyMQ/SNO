import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  password?: string;
  name?: string;
  role?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly saltRounds: number = 10;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  }

  /**
   * Генерация access token
   */
  generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: '24h',
      issuer: 'science-map-api',
      audience: 'science-map-client'
    });
  }

  /**
   * Генерация refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.refreshSecret, { 
      expiresIn: '7d',
      issuer: 'science-map-api',
      audience: 'science-map-client'
    });
  }

  /**
   * Проверка access token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Проверка refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Хеширование пароля
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Сравнение пароля с хешем
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Валидация email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Валидация пароля
   */
  validatePassword(password: string): boolean {
    // Password must be at least 8 characters, contain uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Извлечение токена из заголовка Authorization
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Проверка истечения токена
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Получение времени истечения токена
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Генерация случайного токена для сброса пароля
   */
  generatePasswordResetToken(): string {
    const payload = {
      type: 'password-reset',
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
  }

  /**
   * Проверка токена сброса пароля
   */
  verifyPasswordResetToken(token: string): boolean {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return decoded.type === 'password-reset';
    } catch (error) {
      return false;
    }
  }

  /**
   * Генерация токена для подтверждения email
   */
  generateEmailVerificationToken(email: string): string {
    const payload = {
      type: 'email-verification',
      email,
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  /**
   * Проверка токена подтверждения email
   */
  verifyEmailVerificationToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      if (decoded.type === 'email-verification') {
        return decoded.email;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Создание безопасного случайного пароля
   */
  generateSecurePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&#';
    let password = '';
    
    // Гарантируем наличие разных типов символов
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Заглавная буква
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Строчная буква
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Цифра
    password += '@$!%*?&#'[Math.floor(Math.random() * 8)]; // Специальный символ
    
    // Заполняем остальные символы
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Перемешиваем символы
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Проверка силы пароля
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Пароль должен содержать минимум 8 символов');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте строчные буквы');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте заглавные буквы');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте цифры');
    }

    if (/[@$!%*?&#]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте специальные символы (@$!%*?&#)');
    }

    if (password.length >= 12) {
      score += 1;
    }

    return { score, feedback };
  }
}
