export declare enum DeploymentStrategy {
    CANARY = "canary",
    BLUE_GREEN = "blue_green",
    ROLLING = "rolling",
    RECREATE = "recreate"
}
export declare enum DeploymentStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    SUCCESS = "success",
    FAILED = "failed",
    ROLLED_BACK = "rolled_back",
    CANCELLED = "cancelled"
}
export declare enum HealthCheckType {
    HTTP = "http",
    TCP = "tcp",
    COMMAND = "command",
    CUSTOM = "custom"
}
export interface DeploymentConfig {
    id: string;
    name: string;
    service: string;
    strategy: DeploymentStrategy;
    version: string;
    image: string;
    replicas: number;
    canaryConfig?: CanaryConfig;
    blueGreenConfig?: BlueGreenConfig;
    rollingConfig?: RollingConfig;
    healthCheck: HealthCheckConfig;
    rollbackConfig: RollbackConfig;
    environment: string;
    createdAt: number;
    updatedAt: number;
}
export interface CanaryConfig {
    initialTraffic: number;
    maxTraffic: number;
    incrementStep: number;
    incrementInterval: number;
    successThreshold: number;
    failureThreshold: number;
    metrics: string[];
    duration: number;
}
export interface BlueGreenConfig {
    blueVersion: string;
    greenVersion: string;
    switchTraffic: boolean;
    switchDelay: number;
    keepPreviousVersion: boolean;
}
export interface RollingConfig {
    maxUnavailable: number;
    maxSurge: number;
    updatePeriod: number;
    timeoutSeconds: number;
}
export interface HealthCheckConfig {
    type: HealthCheckType;
    path?: string;
    port?: number;
    command?: string;
    initialDelaySeconds: number;
    periodSeconds: number;
    timeoutSeconds: number;
    successThreshold: number;
    failureThreshold: number;
    customScript?: string;
}
export interface RollbackConfig {
    enabled: boolean;
    maxRevisions: number;
    autoRollback: boolean;
    rollbackTriggers: RollbackTrigger[];
    rollbackTimeout: number;
}
export interface RollbackTrigger {
    type: 'error_rate' | 'response_time' | 'custom_metric' | 'health_check';
    threshold: number;
    duration: number;
    metric?: string;
}
export interface Deployment {
    id: string;
    configId: string;
    status: DeploymentStatus;
    version: string;
    image: string;
    replicas: number;
    currentReplicas: number;
    healthyReplicas: number;
    startedAt: number;
    completedAt?: number;
    duration?: number;
    error?: string;
    metrics: DeploymentMetrics;
    events: DeploymentEvent[];
}
export interface DeploymentMetrics {
    requestRate: number;
    errorRate: number;
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
    customMetrics: Record<string, number>;
}
export interface DeploymentEvent {
    id: string;
    deploymentId: string;
    type: 'started' | 'progress' | 'completed' | 'failed' | 'rolled_back';
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}
export interface DeploymentProgress {
    deploymentId: string;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    progress: number;
    estimatedTimeRemaining?: number;
    status: DeploymentStatus;
}
export interface RollbackPlan {
    deploymentId: string;
    targetVersion: string;
    steps: RollbackStep[];
    estimatedDuration: number;
    risks: string[];
    prerequisites: string[];
}
export interface RollbackStep {
    id: string;
    name: string;
    description: string;
    order: number;
    timeout: number;
    retryable: boolean;
    critical: boolean;
}
//# sourceMappingURL=types.d.ts.map