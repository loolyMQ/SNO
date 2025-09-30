import { DIContainer } from '@science-map/shared';
import { IGraph } from '../types';
import { graphOperationsTotal } from '../metrics';

export interface IUserRegisteredEvent { email: string; name: string; role: string; timestamp: number; }
export interface IUserLoginEvent { userId: string; email: string; timestamp: number; }

export interface IGraphRepository {
  createNode(node: unknown): Promise<unknown>;
  getUserGraph(userId: string): Promise<IGraph>;
  updateNodeProperties(nodeId: string, properties: Record<string, unknown>): Promise<void>;
}

export interface IEventProcessor {
  initialize(): Promise<void>;
  processUserRegistered(event: IUserRegisteredEvent): Promise<void>;
  processUserLogin(event: IUserLoginEvent): Promise<void>;
}

export class EventProcessor implements IEventProcessor {
  constructor(
    private container: DIContainer,
    private graphRepository?: IGraphRepository
  ) {
    // EventProcessor constructor
  }

  async initialize(): Promise<void> {
    this.graphRepository = await this.container.resolve<IGraphRepository>('GraphRepository');
  }

  async processUserRegistered(event: IUserRegisteredEvent): Promise<void> {
    if (!this.graphRepository) throw new Error('GraphRepository not initialized');

    await this.graphRepository.createNode({
      type: 'user',
      label: event.name,
      properties: { email: event.email, role: event.role, registeredAt: event.timestamp }
    });

    graphOperationsTotal.inc({ operation: 'user_node_created', status: 'success' });
  }

  async processUserLogin(event: IUserLoginEvent): Promise<void> {
    if (!this.graphRepository) throw new Error('GraphRepository not initialized');

    const existing = await this.graphRepository.getUserGraph(event.userId);
    const userNode = existing.nodes.find(n => n.type === 'user' && (n.properties['email'] as string) === event.email);

    if (userNode) {
      const prev = Number(userNode.properties['loginCount'] || 0);
      await this.graphRepository.updateNodeProperties(userNode.id, { lastLogin: event.timestamp, loginCount: prev + 1 });
    }

    graphOperationsTotal.inc({ operation: 'user_login_processed', status: 'success' });
  }
}


