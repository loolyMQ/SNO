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

export interface GrpcServerConfig {
  host: string;
  port: number;
  protoPath: string;
  packageName: string;
  serviceName: string;
  credentials?: grpc.ServerCredentials;
  options?: grpc.ServerOptions;
}

export interface GrpcServiceImplementation {
  [methodName: string]: (
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>
  ) => void;
}

export class GrpcServer {
  private server: grpc.Server;
  private config: GrpcServerConfig;

  constructor(config: GrpcServerConfig) {
    this.config = config;
    this.server = this.createServer();
  }

  private createServer(): grpc.Server {
    const options = this.config.options || {};
    const server = new grpc.Server(options);

    logger.info({
      service: 'grpc-server',
      host: this.config.host,
      port: this.config.port,
      packageName: this.config.packageName,
      serviceName: this.config.serviceName
    }, 'Creating gRPC server');

    return server;
  }

  addService(implementation: GrpcServiceImplementation): void {
    const packageDefinition = protoLoader.loadSync(this.config.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const service = (protoDescriptor[this.config.packageName] as Record<string, unknown>)[this.config.serviceName];

    // Add service with logging middleware
    this.server.addService(service.service, this.wrapWithLogging(implementation));

    logger.info({
      service: 'grpc-server',
      methods: Object.keys(implementation)
    }, 'gRPC service added');
  }

  private wrapWithLogging(implementation: GrpcServiceImplementation): GrpcServiceImplementation {
    const wrapped: GrpcServiceImplementation = {};

    for (const [methodName, handler] of Object.entries(implementation)) {
      wrapped[methodName] = (call: grpc.ServerUnaryCall<unknown, unknown>, callback: grpc.sendUnaryData<unknown>) => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(2, 11);

        logger.info({
          service: 'grpc-server',
          method: methodName,
          requestId,
          request: JSON.stringify(call.request)
        }, 'gRPC method called');

        const wrappedCallback: grpc.sendUnaryData<unknown> = (error: grpc.ServiceError | null, response: unknown) => {
          const duration = Date.now() - startTime;

          if (error) {
            logger.error({
              service: 'grpc-server',
              method: methodName,
              requestId,
              error: error instanceof Error ? error.message : String(error),
              code: error.code,
              duration
            }, 'gRPC method failed');
          } else {
            logger.info({
              service: 'grpc-server',
              method: methodName,
              requestId,
              duration
            }, 'gRPC method succeeded');
          }

          callback(error, response);
        };

        try {
          handler(call, wrappedCallback);
        } catch (error) {
          logger.error({
            service: 'grpc-server',
            method: methodName,
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'gRPC method exception');
          
          wrappedCallback(error as grpc.ServiceError, null);
        }
      };
    }

    return wrapped;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const address = `${this.config.host}:${this.config.port}`;
      const credentials = this.config.credentials || grpc.ServerCredentials.createInsecure();

      this.server.bindAsync(address, credentials, (error, port) => {
        if (error) {
          logger.error({
            service: 'grpc-server',
            error: error instanceof Error ? error.message : String(error)
          }, 'Failed to start gRPC server');
          reject(error);
        } else {
          this.server.start();
          logger.info({
            service: 'grpc-server',
            address,
            port
          }, 'gRPC server started');
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.forceShutdown();
      logger.info({
        service: 'grpc-server'
      }, 'gRPC server stopped');
      resolve();
    });
  }

  getServer(): grpc.Server {
    return this.server;
  }
}

export class GrpcServerManager {
  private servers: Map<string, GrpcServer> = new Map();

  createServer(name: string, config: GrpcServerConfig): GrpcServer {
    const server = new GrpcServer(config);
    this.servers.set(name, server);
    
    logger.info({
      service: 'grpc-server-manager',
      serverName: name,
      host: config.host,
      port: config.port
    }, 'gRPC server created');
    
    return server;
  }

  getServer(name: string): GrpcServer | undefined {
    return this.servers.get(name);
  }

  async startAll(): Promise<void> {
    const startPromises = Array.from(this.servers.values()).map(server => server.start());
    await Promise.all(startPromises);
    
    logger.info({
      service: 'grpc-server-manager',
      serverCount: this.servers.size
    }, 'All gRPC servers started');
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.servers.values()).map(server => server.stop());
    await Promise.all(stopPromises);
    
    logger.info({
      service: 'grpc-server-manager',
      serverCount: this.servers.size
    }, 'All gRPC servers stopped');
  }

  getHealthStatus(): Record<string, { healthy: boolean; reason?: string }> {
    const status: Record<string, { healthy: boolean; reason?: string }> = {};
    
    for (const [name, server] of this.servers) {
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

// Factory function for creating gRPC servers
export function createGrpcServer(config: GrpcServerConfig): GrpcServer {
  return new GrpcServer(config);
}

// Predefined server configurations
export const GRPC_SERVER_CONFIGS = {
  auth: {
    host: process.env.AUTH_SERVICE_GRPC_HOST || '0.0.0.0',
    port: parseInt(process.env.AUTH_SERVICE_GRPC_PORT || '50051'),
    protoPath: './platform/shared/src/proto/auth.proto',
    packageName: 'science_map.auth',
    serviceName: 'AuthService',
  },
  graph: {
    host: process.env.GRAPH_SERVICE_GRPC_HOST || '0.0.0.0',
    port: parseInt(process.env.GRAPH_SERVICE_GRPC_PORT || '50052'),
    protoPath: './platform/shared/src/proto/graph.proto',
    packageName: 'science_map.graph',
    serviceName: 'GraphService',
  },
  search: {
    host: process.env.SEARCH_SERVICE_GRPC_HOST || '0.0.0.0',
    port: parseInt(process.env.SEARCH_SERVICE_GRPC_PORT || '50053'),
    protoPath: './platform/shared/src/proto/search.proto',
    packageName: 'science_map.search',
    serviceName: 'SearchService',
  },
  jobs: {
    host: process.env.JOBS_SERVICE_GRPC_HOST || '0.0.0.0',
    port: parseInt(process.env.JOBS_SERVICE_GRPC_PORT || '50054'),
    protoPath: './platform/shared/src/proto/jobs.proto',
    packageName: 'science_map.jobs',
    serviceName: 'JobsService',
  },
} as const;
