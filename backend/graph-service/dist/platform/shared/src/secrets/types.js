export var SecretType;
(function (SecretType) {
    SecretType["PASSWORD"] = "password";
    SecretType["API_KEY"] = "api_key";
    SecretType["JWT_SECRET"] = "jwt_secret";
    SecretType["DATABASE_URL"] = "database_url";
    SecretType["ENCRYPTION_KEY"] = "encryption_key";
    SecretType["CERTIFICATE"] = "certificate";
    SecretType["SSH_KEY"] = "ssh_key";
})(SecretType || (SecretType = {}));
export var SecretStatus;
(function (SecretStatus) {
    SecretStatus["ACTIVE"] = "active";
    SecretStatus["INACTIVE"] = "inactive";
    SecretStatus["EXPIRED"] = "expired";
    SecretStatus["REVOKED"] = "revoked";
    SecretStatus["PENDING"] = "pending";
})(SecretStatus || (SecretStatus = {}));
//# sourceMappingURL=types.js.map