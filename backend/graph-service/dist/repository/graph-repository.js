import { nodeCount, edgeCount } from '../metrics';
export class GraphRepository {
    nodes = new Map();
    edges = new Map();
    userGraphs = new Map();
    constructor() {
        this.initializeSampleData();
    }
    initializeSampleData() {
        const testNodes = [
            {
                id: 'node-1',
                type: 'research',
                label: 'Квантовая механика',
                properties: { field: 'physics', complexity: 'high' },
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'node-2',
                type: 'research',
                label: 'Машинное обучение',
                properties: { field: 'computer_science', complexity: 'medium' },
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'node-3',
                type: 'institution',
                label: 'MIT',
                properties: { type: 'university', country: 'USA' },
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        testNodes.forEach(node => this.nodes.set(node.id, node));
        const testEdges = [
            {
                id: 'edge-1',
                sourceId: 'node-1',
                targetId: 'node-2',
                type: 'cites',
                weight: 0.8,
                properties: { citations: 15 },
                createdAt: new Date()
            },
            {
                id: 'edge-2',
                sourceId: 'node-1',
                targetId: 'node-3',
                type: 'belongs_to',
                weight: 1.0,
                properties: { department: 'Physics' },
                createdAt: new Date()
            }
        ];
        testEdges.forEach(edge => this.edges.set(edge.id, edge));
    }
    async createNode(nodeData) {
        const node = {
            ...nodeData,
            id: `node-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.nodes.set(node.id, node);
        nodeCount.inc({ type: node.type });
        return node;
    }
    async createEdge(edgeData) {
        const edge = {
            ...edgeData,
            id: `edge-${Date.now()}`,
            createdAt: new Date()
        };
        this.edges.set(edge.id, edge);
        edgeCount.inc({ type: edge.type });
        return edge;
    }
    async getNode(id) {
        return this.nodes.get(id) || null;
    }
    async getEdge(id) {
        return this.edges.get(id) || null;
    }
    async getUserGraph(_userId) {
        const nodes = Array.from(this.nodes.values());
        const edges = Array.from(this.edges.values());
        return {
            nodes,
            edges,
            metadata: {
                nodeCount: nodes.length,
                edgeCount: edges.length,
                lastUpdated: new Date()
            }
        };
    }
    async updateNodeProperties(nodeId, properties) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.properties = { ...node.properties, ...properties };
            node.updatedAt = new Date();
            this.nodes.set(nodeId, node);
        }
    }
    async deleteNode(nodeId) {
        this.nodes.delete(nodeId);
        for (const [edgeId, edge] of this.edges) {
            if (edge.sourceId === nodeId || edge.targetId === nodeId) {
                this.edges.delete(edgeId);
            }
        }
    }
    async getGraphStatistics() {
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size
        };
    }
}
//# sourceMappingURL=graph-repository.js.map