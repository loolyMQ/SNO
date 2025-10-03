import { z } from 'zod';

// Query schemas
export const GetUserByIdQuerySchema = z.object({
  userId: z.string(),
});

export const GetUserByEmailQuerySchema = z.object({
  email: z.string().email(),
});

export const ListUsersQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

// Query interfaces
export interface GetUserByIdQuery {
  type: 'GET_USER_BY_ID';
  payload: z.infer<typeof GetUserByIdQuerySchema>;
}

export interface GetUserByEmailQuery {
  type: 'GET_USER_BY_EMAIL';
  payload: z.infer<typeof GetUserByEmailQuerySchema>;
}

export interface ListUsersQuery {
  type: 'LIST_USERS';
  payload: z.infer<typeof ListUsersQuerySchema>;
}

export type AuthQuery = GetUserByIdQuery | GetUserByEmailQuery | ListUsersQuery;

// Query handlers
export class AuthQueryHandler {
  constructor(private prisma: Record<string, unknown>) {}

  async handle(query: AuthQuery): Promise<Record<string, unknown>> {
    switch (query.type) {
      case 'GET_USER_BY_ID':
        return this.handleGetUserById(query);
      case 'GET_USER_BY_EMAIL':
        return this.handleGetUserByEmail(query);
      case 'LIST_USERS':
        return this.handleListUsers(query);
      default:
        throw new Error(`Unknown query type: ${(query as { type: string }).type}`);
    }
  }

  private async handleGetUserById(query: GetUserByIdQuery) {
    const { userId } = query.payload;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: user
    };
  }

  private async handleGetUserByEmail(query: GetUserByEmailQuery) {
    const { email } = query.payload;
    
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: user
    };
  }

  private async handleListUsers(query: ListUsersQuery) {
    const { page, limit, role } = query.payload;
    const skip = (page - 1) * limit;

    const where = role && role.trim() ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where: where })
    ]);

    return {
      success: true,
      users: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
