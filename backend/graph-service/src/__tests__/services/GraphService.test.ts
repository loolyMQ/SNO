import { GraphService } from '../../services/GraphService';
import type { GraphNode, GraphEdge, GraphData, PhysicsConfig } from '@science-map/shared';

// Mock the shared package for testing
jest.mock('@science-map/shared', () => ({
  GraphPhysics: jest.fn().mockImplementation(() => ({
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    updatePhysics: jest.fn(),
    getNodes: jest.fn().mockReturnValue([]),
    getTemperature: jest.fn().mockReturnValue(0.1),
    isStable: jest.fn().mockReturnValue(true),
    reset: jest.fn(),
  })),
}));

describe('GraphService', () => {
  let graphService: GraphService;
  let mockPhysicsConfig: PhysicsConfig;

  beforeEach(() => {
    mockPhysicsConfig = {
      forceStrength: 300,
      linkDistance: 30,
      chargeStrength: -300,
      centerStrength: 0.1,
      temperature: 1.0,
      coolingFactor: 0.99,
      minTemperature: 0.01,
    };
    graphService = new GraphService(mockPhysicsConfig);
  });

  describe('getGraphData', () => {
    it('should return initial graph data with sample nodes and edges', () => {
      const result = graphService.getGraphData();
      
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });
  });

  describe('setGraphData', () => {
    it('should update graph data with new nodes and edges', () => {
      const newData: GraphData = {
        nodes: [
          { id: '1', label: 'Node 1', type: 'topic', x: 0, y: 0 },
          { id: '2', label: 'Node 2', type: 'author', x: 100, y: 100 },
        ],
        edges: [
          { id: '1', source: '1', target: '2', type: 'related_to' },
        ],
      };

      graphService.setGraphData(newData);
      const result = graphService.getGraphData();
      
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('1');
      expect(result.edges[0].source).toBe('1');
    });
  });

  describe('startSimulation', () => {
    it('should start physics simulation', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      graphService.startSimulation();
      
      expect(consoleSpy).toHaveBeenCalledWith('🎯 Симуляция физики запущена');
      consoleSpy.mockRestore();
    });

    it('should not start simulation if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      graphService.startSimulation();
      graphService.startSimulation(); // Second call should be ignored
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('stopSimulation', () => {
    it('should stop physics simulation', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      graphService.startSimulation();
      graphService.stopSimulation();
      
      expect(consoleSpy).toHaveBeenCalledWith('⏹️ Симуляция физики остановлена');
      consoleSpy.mockRestore();
    });
  });

  describe('getPhysicsStats', () => {
    it('should return physics statistics', () => {
      const stats = graphService.getPhysicsStats();
      
      expect(stats).toBeDefined();
      expect(stats.temperature).toBeDefined();
      expect(stats.isStable).toBeDefined();
      expect(stats.isSimulating).toBeDefined();
      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.edgeCount).toBeGreaterThan(0);
    });
  });

  describe('resetPhysics', () => {
    it('should reset physics simulation', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      graphService.resetPhysics();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Физика графа сброшена');
      consoleSpy.mockRestore();
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position and fix it', () => {
      const result = graphService.updateNodePosition('1', 100, 200);
      
      expect(result).toBe(true);
      
      const graphData = graphService.getGraphData();
      const node = graphData.nodes.find(n => n.id === '1');
      expect(node?.x).toBe(100);
      expect(node?.y).toBe(200);
      expect(node?.fx).toBe(100);
      expect(node?.fy).toBe(200);
    });

    it('should return false for non-existent node', () => {
      const result = graphService.updateNodePosition('non-existent', 100, 200);
      
      expect(result).toBe(false);
    });
  });

  describe('releaseNode', () => {
    it('should release node from fixed position', () => {
      // First fix the node
      graphService.updateNodePosition('1', 100, 200);
      
      // Then release it
      const result = graphService.releaseNode('1');
      
      expect(result).toBe(true);
      
      const graphData = graphService.getGraphData();
      const node = graphData.nodes.find(n => n.id === '1');
      expect(node?.fx).toBeNull();
      expect(node?.fy).toBeNull();
    });

    it('should return false for non-existent node', () => {
      const result = graphService.releaseNode('non-existent');
      
      expect(result).toBe(false);
    });
  });
});
