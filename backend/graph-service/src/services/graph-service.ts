import { DIContainer } from '@science-map/shared';
import { IGraphRepository, IGraph, INode, IEdge } from '../types';
import { IGraphAnalytics } from './graph-analytics';
import { graphOperationsTotal, graphRequestDuration } from '../metrics';

export class GraphService {
  constructor(
    private container: DIContainer,
    private graphRepository?: IGraphRepository,
    private graphAnalytics?: IGraphAnalytics
  ) {
    // GraphService constructor
  }

  async initialize(): Promise<void> {
    this.graphRepository = await this.container.resolve<IGraphRepository>('GraphRepository');
    this.graphAnalytics = await this.container.resolve<IGraphAnalytics>('GraphAnalytics');
  }

  async getUserGraph(userId: string): Promise<IGraph> {
    if (!this.graphRepository) throw new Error('Service not initialized');

    const start = Date.now();
    try {
      const graph = await this.graphRepository.getUserGraph(userId);
      graphRequestDuration.labels('get_user_graph').observe((Date.now() - start) / 1000);
      graphOperationsTotal.inc({ operation: 'get_user_graph', status: 'success' });
      return graph;
    } catch (error) {
      graphRequestDuration.labels('get_user_graph').observe((Date.now() - start) / 1000);
      graphOperationsTotal.inc({ operation: 'get_user_graph', status: 'error' });
      throw error;
    }
  }

  async createNode(nodeData: Omit<INode, 'id' | 'createdAt' | 'updatedAt'>): Promise<INode> {
    if (!this.graphRepository) throw new Error('Service not initialized');
    return this.graphRepository.createNode(nodeData);
  }

  async createEdge(edgeData: Omit<IEdge, 'id' | 'createdAt'>): Promise<IEdge> {
    if (!this.graphRepository) throw new Error('Service not initialized');
    return this.graphRepository.createEdge(edgeData);
  }

  async getGraphAnalytics(userId: string): Promise<unknown> {
    if (!this.graphAnalytics) throw new Error('Service not initialized');
    const start = Date.now();
    try {
      const [centrality, communities, collaborations] = await Promise.all([
        this.graphAnalytics.calculateCentrality(userId),
        this.graphAnalytics.detectCommunities(userId),
        this.graphAnalytics.analyzeCollaborationPatterns(userId)
      ]);
      graphRequestDuration.labels('get_analytics').observe((Date.now() - start) / 1000);
      graphOperationsTotal.inc({ operation: 'get_analytics', status: 'success' });
      return { centrality, communities, collaborations };
    } catch (error) {
      graphRequestDuration.labels('get_analytics').observe((Date.now() - start) / 1000);
      graphOperationsTotal.inc({ operation: 'get_analytics', status: 'error' });
      throw error;
    }
  }

  async getStatistics(): Promise<{ nodeCount: number; edgeCount: number }> {
    if (!this.graphRepository) throw new Error('Service not initialized');
    return this.graphRepository.getGraphStatistics();
  }
}


