import type { GraphNode, GraphEdge, PhysicsConfig } from '../../types';

export const createSimulation = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  physicsConfig: PhysicsConfig,
  width: number,
  height: number,
) => {
  // This will be implemented with proper D3 imports
  return {
    force: jest.fn(() => ({
      force: jest.fn(() => ({
        force: jest.fn(() => ({
          force: jest.fn(),
        })),
      })),
    })),
  };
};

export const createZoomBehavior = () => {
  return {
    scaleExtent: jest.fn(() => ({
      on: jest.fn(() => ({
        scaleExtent: jest.fn(),
        on: jest.fn(),
      })),
    })),
  };
};

export const createDragBehavior = () => {
  return {
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(),
      })),
    })),
  };
};

export const calculateNodeSize = (node: GraphNode): number => {
  // Calculate node size based on connections or type
  const baseSize = 8;
  const typeMultiplier = {
    topic: 1.2,
    author: 1.0,
    paper: 0.8,
    institution: 1.5,
  };

  return baseSize * (typeMultiplier[node.type] || 1.0);
};

export const calculateLinkStrength = (
  edge: GraphEdge,
  sourceConnections: number,
  targetConnections: number,
  physicsConfig: PhysicsConfig,
): number => {
  const minConnections = Math.min(sourceConnections, targetConnections);
  const strengthMultiplier = minConnections === 1 ? 0.3 : 1.0;
  return physicsConfig.attraction * strengthMultiplier;
};

export const calculateChargeStrength = (
  node: GraphNode,
  connections: number,
  physicsConfig: PhysicsConfig,
): number => {
  const chargeMultiplier = connections === 1 ? 0.5 : 1.0;
  return -physicsConfig.repulsion * chargeMultiplier;
};
