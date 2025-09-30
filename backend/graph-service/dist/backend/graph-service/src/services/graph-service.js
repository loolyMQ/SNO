import { graphOperationsTotal, graphRequestDuration } from '../metrics';
export class GraphService {
    container;
    graphRepository;
    graphAnalytics;
    constructor(container, graphRepository, graphAnalytics) {
        this.container = container;
        this.graphRepository = graphRepository;
        this.graphAnalytics = graphAnalytics;
        // GraphService constructor
    }
    async initialize() {
        this.graphRepository = await this.container.resolve('GraphRepository');
        this.graphAnalytics = await this.container.resolve('GraphAnalytics');
    }
    async getUserGraph(userId) {
        if (!this.graphRepository)
            throw new Error('Service not initialized');
        const start = Date.now();
        try {
            const graph = await this.graphRepository.getUserGraph(userId);
            graphRequestDuration.labels('get_user_graph').observe((Date.now() - start) / 1000);
            graphOperationsTotal.inc({ operation: 'get_user_graph', status: 'success' });
            return graph;
        }
        catch (error) {
            graphRequestDuration.labels('get_user_graph').observe((Date.now() - start) / 1000);
            graphOperationsTotal.inc({ operation: 'get_user_graph', status: 'error' });
            throw error;
        }
    }
    async createNode(nodeData) {
        if (!this.graphRepository)
            throw new Error('Service not initialized');
        return this.graphRepository.createNode(nodeData);
    }
    async createEdge(edgeData) {
        if (!this.graphRepository)
            throw new Error('Service not initialized');
        return this.graphRepository.createEdge(edgeData);
    }
    async getGraphAnalytics(userId) {
        if (!this.graphAnalytics)
            throw new Error('Service not initialized');
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
        }
        catch (error) {
            graphRequestDuration.labels('get_analytics').observe((Date.now() - start) / 1000);
            graphOperationsTotal.inc({ operation: 'get_analytics', status: 'error' });
            throw error;
        }
    }
    async getStatistics() {
        if (!this.graphRepository)
            throw new Error('Service not initialized');
        return this.graphRepository.getGraphStatistics();
    }
}
//# sourceMappingURL=graph-service.js.map