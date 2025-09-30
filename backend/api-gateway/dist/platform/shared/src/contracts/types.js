export var ContractType;
(function (ContractType) {
    ContractType["HTTP_API"] = "http_api";
    ContractType["KAFKA_EVENT"] = "kafka_event";
    ContractType["DATABASE_SCHEMA"] = "database_schema";
    ContractType["GRAPHQL_SCHEMA"] = "graphql_schema";
})(ContractType || (ContractType = {}));
export var ContractStatus;
(function (ContractStatus) {
    ContractStatus["DRAFT"] = "draft";
    ContractStatus["ACTIVE"] = "active";
    ContractStatus["DEPRECATED"] = "deprecated";
    ContractStatus["BROKEN"] = "broken";
})(ContractStatus || (ContractStatus = {}));
export var TestResult;
(function (TestResult) {
    TestResult["PASSED"] = "passed";
    TestResult["FAILED"] = "failed";
    TestResult["SKIPPED"] = "skipped";
    TestResult["ERROR"] = "error";
})(TestResult || (TestResult = {}));
//# sourceMappingURL=types.js.map