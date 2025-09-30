import { ExternalServiceHealthCheck } from '../types';
import axios, { AxiosResponse } from 'axios';

export async function createExternalServiceHealthCheck(
  name: string,
  url: string,
  timeout: number = 5000
): Promise<ExternalServiceHealthCheck> {
  const startTime = Date.now();

  try {
    const response: AxiosResponse = await axios.get(`${url}/health`, {
      timeout,
      validateStatus: status => status < 500,
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.status === 200 && response.data?.status === 'healthy';
    const isDegraded = response.status >= 400 || responseTime > 2000;

    return {
      name,
      url,
      status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
      responseTime,
      lastCheck: Date.now(),
      statusCode: response.status,
      details: {
        responseData: response.data,
      },
    };
  } catch (error: unknown) {
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      statusCode: (error as any).response?.status,
    };
  }
}

export async function checkMultipleExternalServices(
  services: Array<{ name: string; url: string }>
): Promise<ExternalServiceHealthCheck[]> {
  const promises = services.map(service =>
    createExternalServiceHealthCheck(service.name, service.url)
  );

  return Promise.allSettled(promises).then(results =>
    results.map((result, index) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            name: services[index]?.name || 'unknown',
            url: services[index]?.url || '',
            status: 'unhealthy' as const,
            responseTime: 0,
            lastCheck: Date.now(),
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          }
    )
  );
}
