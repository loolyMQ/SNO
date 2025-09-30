import express from 'express';

export function setupRoutes(app: express.Application, graphService: { getStatistics: () => Promise<{ nodeCount: number; edgeCount: number }>; getUserGraph: (userId: string) => Promise<unknown>; getGraphAnalytics: (userId: string) => Promise<unknown>; }) {
  app.get('/health', async (_req, res) => {
    try {
      const stats = await graphService.getStatistics();
      res.json({ success: true, status: 'healthy', service: 'graph-service-di', ...stats, timestamp: Date.now() });
    } catch (_) {
      res.status(500).json({ success: false, error: 'Health check failed' });
    }
  });

  app.get('/graph/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const graph = await graphService.getUserGraph(userId);
      res.json({ success: true, graph });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get('/graph/:userId/analytics', async (req, res) => {
    try {
      const { userId } = req.params;
      const analytics = await graphService.getGraphAnalytics(userId);
      res.json({ success: true, analytics });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post('/graph/nodes', async (req, res) => {
    try {
      const nodeData = req.body;
      const node = await (graphService as any).createNode(nodeData);
      res.json({ success: true, node });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });

  app.post('/graph/edges', async (req, res) => {
    try {
      const edgeData = req.body;
      const edge = await (graphService as any).createEdge(edgeData);
      res.json({ success: true, edge });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });
}


