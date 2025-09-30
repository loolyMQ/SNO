import { Router } from 'express';
import { register } from '../services/metrics';
import { getHealth, getGatewayHealth } from '../controllers/health';
import { proxyToAuth, proxyToGraph, proxyToSearch, proxyToJobs } from '../controllers/proxy';
import { validateQuery } from '@science-map/shared';
import { healthCheckSchema } from '@science-map/shared';

const router = Router();

router.get('/health', getGatewayHealth);
router.get('/health/services', validateQuery(healthCheckSchema), getHealth);
router.get('/metrics', (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

router.use('/api/v1/auth/*', proxyToAuth);
router.use('/api/v1/graph/*', proxyToGraph);
router.use('/api/v1/search/*', proxyToSearch);
router.use('/api/v1/jobs/*', proxyToJobs);

router.use('/api/v2/auth/*', proxyToAuth);
router.use('/api/v2/graph/*', proxyToGraph);
router.use('/api/v2/search/*', proxyToSearch);
router.use('/api/v2/jobs/*', proxyToJobs);

export default router;
