export class GraphPhysics {
  constructor(config) {
    this.nodes = new Map();
    this.edges = new Map();
    this.frameCount = 0;
    this.config = config;
    this.temperature = config.initialTemperature;
  }
  setNodes(nodes) {
    this.nodes.clear();
    nodes.forEach((node) => {
      this.nodes.set(node.id, { ...node });
    });
  }
  setEdges(edges) {
    this.edges.clear();
    edges.forEach((edge) => {
      this.edges.set(edge.id, { ...edge });
    });
  }
  updatePhysics() {
    this.frameCount++;
    // Обновляем температуру каждые 5 кадров
    if (this.frameCount % 5 === 0) {
      this.temperature = Math.max(
        this.config.minTemperature,
        this.temperature * this.config.coolingRate,
      );
    }
    // Применяем силы отталкивания
    this.applyRepulsion();
    // Применяем силы притяжения от связей
    this.applyAttraction();
    // Применяем гравитацию
    this.applyGravity();
    // Обновляем позиции
    this.updatePositions();
  }
  applyRepulsion() {
    const nodes = Array.from(this.nodes.values());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const dx = (node1.x || 0) - (node2.x || 0);
        const dy = (node1.y || 0) - (node2.y || 0);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = this.config.repulsion / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        node1.vx = (node1.vx || 0) + fx;
        node1.vy = (node1.vy || 0) + fy;
        node2.vx = (node2.vx || 0) - fx;
        node2.vy = (node2.vy || 0) - fy;
      }
    }
  }
  applyAttraction() {
    this.edges.forEach((edge) => {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);
      if (!source || !target) return;
      const dx = (target.x || 0) - (source.x || 0);
      const dy = (target.y || 0) - (source.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDistance = this.config.naturalLinkLength;
      const force = (distance - targetDistance) * this.config.springStiffness;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx = (source.vx || 0) + fx;
      source.vy = (source.vy || 0) + fy;
      target.vx = (target.vx || 0) - fx;
      target.vy = (target.vy || 0) - fy;
    });
  }
  applyGravity() {
    this.nodes.forEach((node) => {
      if (node.fx !== null && node.fy !== null) return; // Фиксированные узлы
      const centerX = 0;
      const centerY = 0;
      const dx = centerX - (node.x || 0);
      const dy = centerY - (node.y || 0);
      node.vx = (node.vx || 0) + dx * this.config.gravity;
      node.vy = (node.vy || 0) + dy * this.config.gravity;
    });
  }
  updatePositions() {
    this.nodes.forEach((node) => {
      if (node.fx !== null && node.fy !== null) return; // Фиксированные узлы
      // Применяем скорость с учетом температуры
      const velocityFactor = Math.min(this.temperature / this.config.initialTemperature, 1);
      node.x = (node.x || 0) + (node.vx || 0) * velocityFactor;
      node.y = (node.y || 0) + (node.vy || 0) * velocityFactor;
      // Применяем демпфирование
      node.vx = (node.vx || 0) * this.config.damping;
      node.vy = (node.vy || 0) * this.config.damping;
    });
  }
  getNodes() {
    return Array.from(this.nodes.values());
  }
  getEdges() {
    return Array.from(this.edges.values());
  }
  getTemperature() {
    return this.temperature;
  }
  isStable() {
    return this.temperature <= this.config.minTemperature;
  }
  reset() {
    this.temperature = this.config.initialTemperature;
    this.frameCount = 0;
    this.nodes.forEach((node) => {
      node.vx = 0;
      node.vy = 0;
    });
  }
}
//# sourceMappingURL=physics.js.map
