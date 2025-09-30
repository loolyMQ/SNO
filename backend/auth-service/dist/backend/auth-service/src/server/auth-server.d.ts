export declare class AuthServer {
    private app;
    private logger;
    private kafkaClient;
    private redisClient;
    private poolManager;
    private authController;
    constructor();
    initialize(): Promise<void>;
    private validateEnvironment;
    private validateJWTConfiguration;
    private initializeInfrastructure;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    start(port?: number): Promise<void>;
}
//# sourceMappingURL=auth-server.d.ts.map