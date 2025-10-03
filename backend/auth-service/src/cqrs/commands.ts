import { z } from 'zod';

// Command schemas
export const RegisterUserCommandSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginUserCommandSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateUserRoleCommandSchema = z.object({
  userId: z.string(),
  role: z.enum(['user', 'admin', 'moderator']),
});

// Command interfaces
export interface RegisterUserCommand {
  type: 'REGISTER_USER';
  payload: z.infer<typeof RegisterUserCommandSchema>;
}

export interface LoginUserCommand {
  type: 'LOGIN_USER';
  payload: z.infer<typeof LoginUserCommandSchema>;
}

export interface UpdateUserRoleCommand {
  type: 'UPDATE_USER_ROLE';
  payload: z.infer<typeof UpdateUserRoleCommandSchema>;
}

export type AuthCommand = RegisterUserCommand | LoginUserCommand | UpdateUserRoleCommand;

// Command handlers
export class AuthCommandHandler {
  constructor(
    private prisma: Record<string, unknown>,
    private bcrypt: Record<string, unknown>,
    private jwt: Record<string, unknown>
  ) {}

  async handle(command: AuthCommand): Promise<Record<string, unknown>> {
    switch (command.type) {
      case 'REGISTER_USER':
        return this.handleRegisterUser(command);
      case 'LOGIN_USER':
        return this.handleLoginUser(command);
      case 'UPDATE_USER_ROLE':
        return this.handleUpdateUserRole(command);
      default:
        throw new Error(`Unknown command type: ${(command as { type: string }).type}`);
    }
  }

  private async handleRegisterUser(command: RegisterUserCommand) {
    const { email, password } = command.payload;
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await this.bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: { email, passwordHash: passwordHash }
    });

    return {
      success: true,
      user: { id: user.id, email: user.email }
    };
  }

  private async handleLoginUser(command: LoginUserCommand) {
    const { email, password } = command.payload;
    
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (!user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await this.bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '15m' }
    );

    return {
      success: true,
      token: token,
      user: { id: user.id, email: user.email, role: user.role || 'user' }
    };
  }

  private async handleUpdateUserRole(command: UpdateUserRoleCommand) {
    const { userId, role } = command.payload;
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    return {
      success: true,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}
