const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3003',
  graph: process.env.GRAPH_SERVICE_URL || 'http://localhost:3002',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3004',
  jobs: process.env.JOBS_SERVICE_URL || 'http://localhost:3005',
};

app.get('/api/health', async (req, res) => {
  const healthChecks = {};
  
  for (const [service, url] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      healthChecks[service] = response.data;
    } catch (error) {
      healthChecks[service] = { success: false, error: 'Service unavailable' };
    }
  }

  res.json({
    success: true,
    status: 'healthy',
    services: healthChecks,
    timestamp: Date.now(),
  });
});

app.get('/api/graph/data', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.graph}/graph/data`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Graph service unavailable',
    });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.search}/search`, {
      params: req.query,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search service unavailable',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const response = await axios.post(`${SERVICES.auth}/auth/login`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Auth service unavailable',
    });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.jobs}/jobs`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Jobs service unavailable',
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Science Map API Gateway',
    version: '1.0.0',
    services: Object.keys(SERVICES),
    timestamp: Date.now(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});