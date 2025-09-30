import { ProxyService } from '../services/proxy';
import { services } from '../config';
import { asyncErrorHandler } from '@science-map/shared';
const proxyService = new ProxyService(services);
export const proxyToAuth = asyncErrorHandler(async (req, res) => {
    return proxyService.proxyRequest(req, res, 'auth', req.path);
});
export const proxyToGraph = asyncErrorHandler(async (req, res) => {
    return proxyService.proxyRequest(req, res, 'graph', req.path);
});
export const proxyToSearch = asyncErrorHandler(async (req, res) => {
    return proxyService.proxyRequest(req, res, 'search', req.path);
});
export const proxyToJobs = asyncErrorHandler(async (req, res) => {
    return proxyService.proxyRequest(req, res, 'jobs', req.path);
});
//# sourceMappingURL=proxy.js.map