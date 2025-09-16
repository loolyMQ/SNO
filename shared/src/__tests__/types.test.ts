describe('Types', () => {
  it('should define GraphNode type correctly', () => {
    type GraphNode = {
      id: string;
      label: string;
      type: 'topic' | 'author' | 'institution' | 'paper';
      x?: number;
      y?: number;
      vx?: number;
      vy?: number;
    };

    const node: GraphNode = {
      id: '1',
      label: 'Test Node',
      type: 'topic',
    };

    expect(node.id).toBe('1');
    expect(node.label).toBe('Test Node');
    expect(node.type).toBe('topic');
  });

  it('should define GraphEdge type correctly', () => {
    type GraphEdge = {
      id: string;
      source: string;
      target: string;
      type: 'related_to' | 'authored_by' | 'belongs_to' | 'cites';
    };

    const edge: GraphEdge = {
      id: '1',
      source: '1',
      target: '2',
      type: 'related_to',
    };

    expect(edge.id).toBe('1');
    expect(edge.source).toBe('1');
    expect(edge.target).toBe('2');
    expect(edge.type).toBe('related_to');
  });

  it('should define GraphData type correctly', () => {
    type GraphNode = {
      id: string;
      label: string;
      type: 'topic' | 'author' | 'institution' | 'paper';
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

    const graphData: GraphData = {
      nodes: [
        { id: '1', label: 'Node 1', type: 'topic' },
        { id: '2', label: 'Node 2', type: 'author' },
      ],
      edges: [{ id: '1', source: '1', target: '2', type: 'related_to' }],
    };

    expect(graphData.nodes).toHaveLength(2);
    expect(graphData.edges).toHaveLength(1);
    expect(graphData.nodes[0].id).toBe('1');
    expect(graphData.edges[0].source).toBe('1');
  });
});
