import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export interface GrpcClientConfig {
  host: string;
  port: number;
  protoPath: string;
  packageName: string;
  serviceName: string;
  credentials?: grpc.ChannelCredentials;
  options?: grpc.ChannelOptions;
}

export class GrpcClient {
  private client: grpc.Client;
  private config: GrpcClientConfig;

  constructor(config: GrpcClientConfig) {
    this.config = config;
    this.client = this.createClient();
  }

  private createClient(): grpc.Client {
    const packageDefinition = protoLoader.loadSync(this.config.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const service = (protoDescriptor[this.config.packageName] as Record<string, unknown>)[this.config.serviceName];

    const address = `${this.config.host}:${this.config.port}`;
    const credentials = this.config.credentials || grpc.credentials.createInsecure();
    const options = this.config.options || {};

    logger.info({
      service: 'grpc-client',
      address,
      packageName: this.config.packageName,
      serviceName: this.config.serviceName
    }, 'Creating gRPC client');

    return new service(address, credentials, options);
  }

  async call<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: grpc.Metadata
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      logger.debug({
        service: 'grpc-client',
        method,
        request: JSON.stringify(request)
      }, 'Making gRPC call');

      if (typeof this.client[method] !== 'function') {
        reject(new Error(`Method ${method} not found on gRPC client`));
        return;
      }
      
      this.client[method](request, metadata || new grpc.Metadata(), (error: grpc.ServiceError | null, response: TResponse) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          logger.error({
            service: 'grpc-client',
            method,
            error: error instanceof Error ? error.message : String(error),
            code: error.code,
            duration
          }, 'gRPC call failed');
          reject(error);
        } else {
          logger.debug({
            service: 'grpc-client',
            method,
            duration
          }, 'gRPC call succeeded');
          resolve(response);
        }
      });
    });
  }

  close(): void {
    this.client.close();
    logger.info({
      service: 'grpc-client'
    }, 'gRPC client closed');
  }
}

export class GrpcClientManager {
  private clients: Map<string, GrpcClient> = new Map();

  createClient(name: string, config: GrpcClientConfig): GrpcClient {
    const client = new GrpcClient(config);
    this.clients.set(name, client);
    
    logger.info({
      service: 'grpc-client-manager',
      clientName: name,
      host: config.host,
      port: config.port
    }, 'gRPC client created');
    
    return client;
  }

  getClient(name: string): GrpcClient | undefined {
    return this.clients.get(name);
  }

  closeAll(): void {
    for (const [name, client] of this.clients) {
      client.close();
      logger.info({
        service: 'grpc-client-manager',
        clientName: name
      }, 'gRPC client closed');
    }
    this.clients.clear();
  }

  getHealthStatus(): Record<string, { healthy: boolean; reason?: string }> {
    const status: Record<string, { healthy: boolean; reason?: string }> = {};
    
    for (const [name, client] of this.clients) {
      try {
        // Simple health check - in production this would be more sophisticated
        status[name] = { healthy: true };
      } catch (error) {
        status[name] = {
          healthy: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return status;
  }
}

// Factory function for creating gRPC clients
export function createGrpcClient(config: GrpcClientConfig): GrpcClient {
  return new GrpcClient(config);
}

// Predefined client configurations
export const GRPC_CLIENT_CONFIGS = {
  auth: {
    host: process.env.AUTH_SERVICE_GRPC_HOST || 'localhost',
    port: parseInt(process.env.AUTH_SERVICE_GRPC_PORT || '50051'),
    protoPath: './platform/shared/src/proto/auth.proto',
    packageName: 'science_map.auth',
    serviceName: 'AuthService',
  },
  graph: {
    host: process.env.GRAPH_SERVICE_GRPC_HOST || 'localhost',
    port: parseInt(process.env.GRAPH_SERVICE_GRPC_PORT || '50052'),
    protoPath: './platform/shared/src/proto/graph.proto',
    packageName: 'science_map.graph',
    serviceName: 'GraphService',
  },
  search: {
    host: process.env.SEARCH_SERVICE_GRPC_HOST || 'localhost',
    port: parseInt(process.env.SEARCH_SERVICE_GRPC_PORT || '50053'),
    protoPath: './platform/shared/src/proto/search.proto',
    packageName: 'science_map.search',
    serviceName: 'SearchService',
  },
  jobs: {
    host: process.env.JOBS_SERVICE_GRPC_HOST || 'localhost',
    port: parseInt(process.env.JOBS_SERVICE_GRPC_PORT || '50054'),
    protoPath: './platform/shared/src/proto/jobs.proto',
    packageName: 'science_map.jobs',
    serviceName: 'JobsService',
  },
} as const;
