export var DeploymentStrategy;
(function (DeploymentStrategy) {
    DeploymentStrategy["CANARY"] = "canary";
    DeploymentStrategy["BLUE_GREEN"] = "blue_green";
    DeploymentStrategy["ROLLING"] = "rolling";
    DeploymentStrategy["RECREATE"] = "recreate";
})(DeploymentStrategy || (DeploymentStrategy = {}));
export var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "pending";
    DeploymentStatus["IN_PROGRESS"] = "in_progress";
    DeploymentStatus["SUCCESS"] = "success";
    DeploymentStatus["FAILED"] = "failed";
    DeploymentStatus["ROLLED_BACK"] = "rolled_back";
    DeploymentStatus["CANCELLED"] = "cancelled";
})(DeploymentStatus || (DeploymentStatus = {}));
export var HealthCheckType;
(function (HealthCheckType) {
    HealthCheckType["HTTP"] = "http";
    HealthCheckType["TCP"] = "tcp";
    HealthCheckType["COMMAND"] = "command";
    HealthCheckType["CUSTOM"] = "custom";
})(HealthCheckType || (HealthCheckType = {}));
//# sourceMappingURL=types.js.map