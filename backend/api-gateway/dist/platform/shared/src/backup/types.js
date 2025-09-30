export var BackupType;
(function (BackupType) {
    BackupType["FULL"] = "full";
    BackupType["INCREMENTAL"] = "incremental";
    BackupType["DIFFERENTIAL"] = "differential";
})(BackupType || (BackupType = {}));
export var BackupStatus;
(function (BackupStatus) {
    BackupStatus["PENDING"] = "pending";
    BackupStatus["IN_PROGRESS"] = "in_progress";
    BackupStatus["COMPLETED"] = "completed";
    BackupStatus["FAILED"] = "failed";
    BackupStatus["CANCELLED"] = "cancelled";
})(BackupStatus || (BackupStatus = {}));
export var BackupRetention;
(function (BackupRetention) {
    BackupRetention["DAILY"] = "daily";
    BackupRetention["WEEKLY"] = "weekly";
    BackupRetention["MONTHLY"] = "monthly";
    BackupRetention["YEARLY"] = "yearly";
})(BackupRetention || (BackupRetention = {}));
//# sourceMappingURL=types.js.map