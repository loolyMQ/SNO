import { useRef, useEffect } from 'react';
import type { GraphNode, GraphEdge } from '../../../types';

interface UseGraphRenderingProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
}

export const useGraphRendering = ({ nodes, edges, onNodeClick }: UseGraphRenderingProps) => {
  const containerRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Render nodes and edges
    // This is a simplified version - in real implementation would use actual D3
    const container = containerRef.current;

    // Clear previous content
    container.innerHTML = '';

    // Render edges
    edges.forEach((edge) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', '#999');
      line.setAttribute('stroke-width', '2');
      container.appendChild(line);
    });

    // Render nodes
    nodes.forEach((node) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', '#69b3a2');
      circle.setAttribute('cursor', 'pointer');

      if (onNodeClick) {
        circle.addEventListener('click', () => onNodeClick(node.id));
      }

      container.appendChild(circle);
    });
  }, [nodes, edges, onNodeClick]);

  return containerRef;
};
