import { create } from 'zustand';

const useGraphStore = create((set, get) => ({
  // State
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  isLoading: false,
  error: null,
  layout: 'force',
  zoom: 1,
  center: { x: 0, y: 0 },
  filters: {
    nodeTypes: [],
    edgeTypes: [],
    minWeight: 0,
    maxWeight: 1,
  },
  searchQuery: '',
  highlightedNodes: [],
  highlightedEdges: [],

  // Actions
  loadGraph: async (graphId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/graph/${graphId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load graph');
      }

      const data = await response.json();
      
      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        isLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        nodes: [],
        edges: [],
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  updateGraph: async (graphData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/graph/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update graph');
      }

      const data = await response.json();
      
      set({
        nodes: data.nodes || [],
        edges: data.edges || [],
        isLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  selectNode: (nodeId) => {
    set({ selectedNode: nodeId });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdge: edgeId });
  },

  clearSelection: () => {
    set({ selectedNode: null, selectedEdge: null });
  },

  setLayout: (layout) => {
    set({ layout });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  setCenter: (center) => {
    set({ center });
  },

  setFilters: (filters) => {
    set({ filters });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  highlightNodes: (nodeIds) => {
    set({ highlightedNodes: nodeIds });
  },

  highlightEdges: (edgeIds) => {
    set({ highlightedEdges: edgeIds });
  },

  clearHighlights: () => {
    set({ highlightedNodes: [], highlightedEdges: [] });
  },

  clearError: () => {
    set({ error: null });
  },

  // Getters
  getNodeById: (nodeId) => {
    const { nodes } = get();
    return nodes.find(node => node.id === nodeId);
  },

  getEdgeById: (edgeId) => {
    const { edges } = get();
    return edges.find(edge => edge.id === edgeId);
  },

  getConnectedNodes: (nodeId) => {
    const { nodes, edges } = get();
    const connectedEdgeIds = edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);
    
    return nodes.filter(node => connectedEdgeIds.includes(node.id));
  },

  getFilteredNodes: () => {
    const { nodes, filters, searchQuery } = get();
    
    return nodes.filter(node => {
      // Type filter
      if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) {
        return false;
      }
      
      // Search query
      if (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  },

  getFilteredEdges: () => {
    const { edges, filters } = get();
    
    return edges.filter(edge => {
      // Type filter
      if (filters.edgeTypes.length > 0 && !filters.edgeTypes.includes(edge.type)) {
        return false;
      }
      
      // Weight filter
      if (edge.weight < filters.minWeight || edge.weight > filters.maxWeight) {
        return false;
      }
      
      return true;
    });
  },

  getGraphStats: () => {
    const { nodes, edges } = get();
    
    const nodeTypes = {};
    const edgeTypes = {};
    
    nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });
    
    edges.forEach(edge => {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    });
    
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes,
    };
  },
}));

export { useGraphStore };
