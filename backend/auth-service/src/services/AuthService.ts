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
  private readonly saltRounds: number = 10;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
  }

  generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (_error) {
      throw new Error('Invalid token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(_password: string): boolean {
    // Password must be at least 8 characters, contain uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(_password);
  }

  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }

  async login(email: string, password: string): Promise<{ user: User; token: string; refreshToken: string }> {
    // This would typically involve database lookup
    // For now, return mock data
    const user: User = {
      id: '123',
      email,
      name: 'Test User',
      role: 'user',
    };

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, token, refreshToken };
  }

  async register(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.validatePassword(password)) {
      throw new Error('Password does not meet requirements');
    }

    const hashedPassword = await this.hashPassword(password);
    
    const user: User = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role: 'user',
    };

    const token = this.generateToken(user);

    return { user, token };
  }
}
