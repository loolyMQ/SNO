export declare enum ContractType {
    HTTP_API = "http_api",
    KAFKA_EVENT = "kafka_event",
    DATABASE_SCHEMA = "database_schema",
    GRAPHQL_SCHEMA = "graphql_schema"
}
export declare enum ContractStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    DEPRECATED = "deprecated",
    BROKEN = "broken"
}
export declare enum TestResult {
    PASSED = "passed",
    FAILED = "failed",
    SKIPPED = "skipped",
    ERROR = "error"
}
export interface Contract {
    id: string;
    name: string;
    type: ContractType;
    status: ContractStatus;
    version: string;
    provider: string;
    consumer: string;
    description?: string;
    schema: ContractSchema;
    examples: ContractExample[];
    createdAt: number;
    updatedAt: number;
    lastValidated?: number;
}
export interface ContractSchema {
    request?: SchemaDefinition;
    response?: SchemaDefinition;
    event?: SchemaDefinition;
    database?: SchemaDefinition;
}
export interface SchemaDefinition {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    properties?: Record<string, SchemaDefinition>;
    items?: SchemaDefinition;
    required?: string[];
    enum?: unknown[];
    format?: string;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    description?: string;
}
export interface ContractExample {
    name: string;
    description?: string;
    request?: unknown;
    response?: unknown;
    event?: unknown;
    database?: unknown;
}
export interface ContractTest {
    id: string;
    contractId: string;
    name: string;
    description?: string;
    testType: 'consumer' | 'provider';
    testData: unknown;
    expectedResult: unknown;
    actualResult?: unknown;
    result: TestResult;
    error?: string;
    duration: number;
    executedAt: number;
}
export interface ContractValidation {
    contractId: string;
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    validatedAt: number;
    validatedBy: string;
}
export interface ValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
    code: string;
}
export interface ValidationWarning {
    path: string;
    message: string;
    suggestion?: string;
}
export interface ContractMetrics {
    contractId: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    errorTests: number;
    successRate: number;
    averageDuration: number;
    lastTestRun?: number;
}
export interface ContractComparison {
    contractId: string;
    version1: string;
    version2: string;
    breakingChanges: BreakingChange[];
    nonBreakingChanges: NonBreakingChange[];
    compatibility: 'compatible' | 'incompatible' | 'unknown';
}
export interface BreakingChange {
    type: 'removed_field' | 'changed_type' | 'added_required_field' | 'removed_enum_value';
    path: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
}
export interface NonBreakingChange {
    type: 'added_field' | 'added_optional_field' | 'added_enum_value';
    path: string;
    description: string;
}
//# sourceMappingURL=types.d.ts.map