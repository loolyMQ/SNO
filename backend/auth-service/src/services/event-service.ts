import pino from 'pino';
import { KafkaClient } from '@science-map/shared';
import { IUser } from '../repositories/user-repository';

export class PooledEventService {
  constructor(
    private kafkaPool: KafkaClient,
    private logger: pino.Logger
  ) {}

  async publishUserRegistered(user: IUser): Promise<void> {
    try {
      const event = {
        type: 'USER_REGISTERED',
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        eventId: `reg_${user.id}_${Date.now()}`
      };

      await this.kafkaPool.publish('auth-events', {
        type: 'USER_REGISTERED',
        payload: event,
        correlationId: event.eventId,
        userId: user.id
      });

      this.logger.info(`User registered event published: ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to publish user registered event:', error);
      throw error;
    }
  }

  async publishUserLogin(user: IUser): Promise<void> {
    try {
      const event = {
        type: 'USER_LOGIN',
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
        eventId: `login_${user.id}_${Date.now()}`
      };

      await this.kafkaPool.publish('auth-events', {
        type: 'USER_LOGIN',
        payload: event,
        correlationId: event.eventId,
        userId: user.id
      });

      this.logger.info(`User login event published: ${user.id}`);
    } catch (error) {
      this.logger.error('Failed to publish user login event:', error);
      throw error;
    }
  }

  async publishUserLogout(userId: string): Promise<void> {
    try {
      const event = {
        type: 'USER_LOGOUT',
        userId,
        timestamp: new Date().toISOString(),
        eventId: `logout_${userId}_${Date.now()}`
      };

      await this.kafkaPool.publish('auth-events', {
        type: 'USER_LOGOUT',
        payload: event,
        correlationId: event.eventId,
        userId: userId
      });

      this.logger.info(`User logout event published: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish user logout event:', error);
      throw error;
    }
  }
}

