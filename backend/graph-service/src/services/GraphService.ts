import { GraphNode, GraphEdge, GraphData, GraphPhysics, PhysicsConfig, ApiResponse } from '@science-map/shared';

export class GraphService {
  private physics: GraphPhysics;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private isSimulating: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(physicsConfig: PhysicsConfig) {
    this.physics = new GraphPhysics(physicsConfig);
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Создаем тестовые данные
    const sampleNodes: GraphNode[] = [
      { id: '1', label: 'Машинное обучение', type: 'topic', x: 0, y: 0 },
      { id: '2', label: 'Нейронные сети', type: 'topic', x: 100, y: 100 },
      { id: '3', label: 'Глубокое обучение', type: 'topic', x: -100, y: 100 },
      { id: '4', label: 'Иван Петров', type: 'author', x: 0, y: 200 },
      { id: '5', label: 'Мария Сидорова', type: 'author', x: 200, y: 0 },
      { id: '6', label: 'МГУ', type: 'institution', x: -200, y: 0 },
      { id: '7', label: 'Исследование ИИ', type: 'paper', x: 0, y: -200 },
    ];

    const sampleEdges: GraphEdge[] = [
      { id: 'e1', source: '1', target: '2', type: 'related_to', weight: 0.8 },
      { id: 'e2', source: '1', target: '3', type: 'related_to', weight: 0.9 },
      { id: 'e3', source: '2', target: '3', type: 'related_to', weight: 0.7 },
      { id: 'e4', source: '4', target: '1', type: 'authored_by', weight: 0.6 },
      { id: 'e5', source: '5', target: '2', type: 'authored_by', weight: 0.8 },
      { id: 'e6', source: '4', target: '6', type: 'belongs_to', weight: 1.0 },
      { id: 'e7', source: '7', target: '1', type: 'cites', weight: 0.9 },
    ];

    this.setGraphData({ nodes: sampleNodes, edges: sampleEdges });
  }

  setGraphData(data: GraphData): void {
    this.nodes.clear();
    this.edges.clear();

    data.nodes.forEach(node => {
      this.nodes.set(node.id, { ...node });
    });

    data.edges.forEach(edge => {
      this.edges.set(edge.id, { ...edge });
    });

    this.physics.setNodes(data.nodes);
    this.physics.setEdges(data.edges);
  }

  getGraphData(): GraphData {
    const nodes = Array.from(this.nodes.values());
    const edges = Array.from(this.edges.values());
    return { nodes, edges };
  }

  startSimulation(): void {
    if (this.isSimulating) return;

    this.isSimulating = true;
    this.simulationInterval = setInterval(() => {
      this.physics.updatePhysics();
      
      // Обновляем позиции узлов
      const updatedNodes = this.physics.getNodes();
      updatedNodes.forEach(node => {
        const existingNode = this.nodes.get(node.id);
        if (existingNode) {
          existingNode.x = node.x;
          existingNode.y = node.y;
          existingNode.vx = node.vx;
          existingNode.vy = node.vy;
        }
      });
    }, 16); // ~60 FPS

    console.log('🎯 Симуляция физики запущена');
  }

  stopSimulation(): void {
    if (!this.isSimulating) return;

    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    console.log('⏹️ Симуляция физики остановлена');
  }

  getPhysicsStats(): any {
    return {
      temperature: this.physics.getTemperature(),
      isStable: this.physics.isStable(),
      isSimulating: this.isSimulating,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
    };
  }

  resetPhysics(): void {
    this.physics.reset();
    console.log('🔄 Физика графа сброшена');
  }

  updateNodePosition(nodeId: string, x: number, y: number): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.x = x;
    node.y = y;
    node.fx = x; // Фиксируем позицию
    node.fy = y;

    return true;
  }

  releaseNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.fx = null;
    node.fy = null;

    return true;
  }
}
