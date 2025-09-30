import { graphOperationsTotal } from '../metrics';
export class EventProcessor {
    container;
    graphRepository;
    constructor(container, graphRepository) {
        this.container = container;
        this.graphRepository = graphRepository;
    }
    async initialize() {
        this.graphRepository = await this.container.resolve('GraphRepository');
    }
    async processUserRegistered(event) {
        if (!this.graphRepository)
            throw new Error('GraphRepository not initialized');
        await this.graphRepository.createNode({
            type: 'user',
            label: event.name,
            properties: { email: event.email, role: event.role, registeredAt: event.timestamp }
        });
        graphOperationsTotal.inc({ operation: 'user_node_created', status: 'success' });
    }
    async processUserLogin(event) {
        if (!this.graphRepository)
            throw new Error('GraphRepository not initialized');
        const existing = await this.graphRepository.getUserGraph(event.userId);
        const userNode = existing.nodes.find(n => n.type === 'user' && n.properties['email'] === event.email);
        if (userNode) {
            const prev = Number(userNode.properties['loginCount'] || 0);
            await this.graphRepository.updateNodeProperties(userNode.id, { lastLogin: event.timestamp, loginCount: prev + 1 });
        }
        graphOperationsTotal.inc({ operation: 'user_login_processed', status: 'success' });
    }
}
//# sourceMappingURL=event-processor.js.map