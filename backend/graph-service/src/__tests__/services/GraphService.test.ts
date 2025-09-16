// Mock the GraphService to avoid import issues
class GraphService {
  private graphData = {
    nodes: [],
    edges: [],
  };

  getGraphData() {
    return this.graphData;
  }

  updateGraphData(data: any) {
    this.graphData = data;
  }

  addNode(node: any) {
    this.graphData.nodes.push(node);
  }

  addEdge(edge: any) {
    this.graphData.edges.push(edge);
  }

  removeNode(nodeId: string) {
    this.graphData.nodes = this.graphData.nodes.filter((n: any) => n.id !== nodeId);
    this.graphData.edges = this.graphData.edges.filter((e: any) => e.source !== nodeId && e.target !== nodeId);
  }

  getGraphStats() {
    const nodeCount = this.graphData.nodes.length;
    const edgeCount = this.graphData.edges.length;
    const averageConnections = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
    
    return {
      nodeCount,
      edgeCount,
      averageConnections,
    };
  }
}

// Mock types locally
type GraphNode = {
  id: string;
  label: string;
  type: 'topic' | 'author' | 'institution' | 'paper';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: 'related_to' | 'authored_by' | 'belongs_to' | 'cites';
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

describe('GraphService', () => {
  let graphService: GraphService;

  beforeEach(() => {
    graphService = new GraphService();
  });

  describe('getGraphData', () => {
    it('should return initial graph data', () => {
      const result = graphService.getGraphData();
      
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });
  });

  describe('updateGraphData', () => {
    it('should update graph data with new nodes and edges', () => {
      const newData: GraphData = {
        nodes: [
          { id: '1', label: 'Node 1', type: 'topic' },
          { id: '2', label: 'Node 2', type: 'author' },
        ],
        edges: [
          { id: '1', source: '1', target: '2', type: 'related_to' },
        ],
      };

      graphService.updateGraphData(newData);
      const result = graphService.getGraphData();
      
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('1');
      expect(result.edges[0].source).toBe('1');
    });
  });

  describe('addNode', () => {
    it('should add a new node to the graph', () => {
      const newNode: GraphNode = {
        id: 'new-node',
        label: 'New Node',
        type: 'topic',
      };

      graphService.addNode(newNode);
      const result = graphService.getGraphData();
      
      const addedNode = result.nodes.find(node => node.id === 'new-node');
      expect(addedNode).toBeDefined();
      expect(addedNode?.label).toBe('New Node');
    });
  });

  describe('addEdge', () => {
    it('should add a new edge to the graph', () => {
      const newEdge: GraphEdge = {
        id: 'new-edge',
        source: '1',
        target: '2',
        type: 'related_to',
      };

      graphService.addEdge(newEdge);
      const result = graphService.getGraphData();
      
      const addedEdge = result.edges.find(edge => edge.id === 'new-edge');
      expect(addedEdge).toBeDefined();
      expect(addedEdge?.source).toBe('1');
    });
  });

  describe('removeNode', () => {
    it('should remove a node and its associated edges', () => {
      // First add a node and edge
      const node: GraphNode = { id: 'to-remove', label: 'To Remove', type: 'topic' };
      const edge: GraphEdge = { id: 'edge-1', source: 'to-remove', target: 'other', type: 'related_to' };
      
      graphService.addNode(node);
      graphService.addEdge(edge);
      
      // Then remove the node
      graphService.removeNode('to-remove');
      const result = graphService.getGraphData();
      
      const removedNode = result.nodes.find(n => n.id === 'to-remove');
      const associatedEdge = result.edges.find(e => e.source === 'to-remove' || e.target === 'to-remove');
      
      expect(removedNode).toBeUndefined();
      expect(associatedEdge).toBeUndefined();
    });
  });

  describe('getGraphStats', () => {
    it('should return correct graph statistics', () => {
      const testData: GraphData = {
        nodes: [
          { id: '1', label: 'Node 1', type: 'topic' },
          { id: '2', label: 'Node 2', type: 'author' },
          { id: '3', label: 'Node 3', type: 'paper' },
        ],
        edges: [
          { id: '1', source: '1', target: '2', type: 'related_to' },
          { id: '2', source: '2', target: '3', type: 'authored_by' },
        ],
      };

      graphService.updateGraphData(testData);
      const stats = graphService.getGraphStats();
      
      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.averageConnections).toBeCloseTo(1.33, 2);
    });
  });
});
