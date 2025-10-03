# Branch Protection Rules

## Main Branch Protection

### Required Status Checks
- [x] **quality-gates** - TypeScript, ESLint, Tests, Coverage
- [x] **security-scan** - Snyk, Trivy vulnerability scanning
- [x] **e2e-tests** - Playwright E2E tests
- [x] **performance-tests** - Load testing with autocannon
- [x] **docker-build** - Docker image build and test

### Branch Protection Settings
```yaml
main:
  required_status_checks:
    strict: true
    contexts:
      - quality-gates
      - security-scan
      - e2e-tests
      - performance-tests
      - docker-build
  enforce_admins: true
  required_pull_request_reviews:
    required_approving_review_count: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  restrictions:
    users: []
    teams: []
```

## Quality Gates

### 1. TypeScript Compilation
- **Rule**: 0 TypeScript errors
- **Command**: `pnpm type-check`
- **Threshold**: Must pass

### 2. ESLint Checks
- **Rule**: 0 ESLint errors, 0 warnings
- **Command**: `pnpm lint`
- **Threshold**: Must pass

### 3. Test Coverage
- **Rule**: ≥80% coverage
- **Command**: `pnpm test:coverage`
- **Threshold**: 80% minimum

### 4. Security Scan
- **Rule**: No high/critical vulnerabilities
- **Tools**: Snyk + Trivy
- **Threshold**: 0 high/critical issues

### 5. E2E Tests
- **Rule**: All E2E tests pass
- **Command**: `pnpm test:e2e`
- **Threshold**: 100% pass rate

### 6. Performance Tests
- **Rule**: Latency and throughput within limits
- **Command**: `pnpm test:performance`
- **Threshold**: 
  - Average latency ≤ 200ms
  - P95 latency ≤ 400ms
  - Error rate ≤ 1%

### 7. Docker Build
- **Rule**: All images build successfully
- **Command**: `pnpm docker:build`
- **Threshold**: 100% success rate

## Pull Request Requirements

### Required Reviews
- **Minimum**: 2 approvals
- **Code Owners**: Required
- **Stale Reviews**: Dismissed automatically

### Required Checks
- All quality gates must pass
- No merge conflicts
- Up-to-date with main branch

### Commit Requirements
- **Conventional Commits**: Required
- **Format**: `type(scope): description`
- **Examples**:
  - `feat(auth): add JWT authentication`
  - `fix(api): resolve CORS issues`
  - `docs(readme): update installation guide`

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types allowed
- Explicit return types required
- No unused variables

### ESLint Rules
- No console.log statements
- Consistent code style
- No unused imports
- Proper error handling

### Test Requirements
- Unit tests for all new features
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for high-traffic endpoints

### Security Requirements
- No hardcoded secrets
- Input validation on all endpoints
- Proper authentication/authorization
- Regular dependency updates

## Deployment Gates

### Pre-deployment Checks
1. All quality gates pass
2. Security scan clean
3. Performance tests pass
4. Docker images build
5. Health checks pass

### Post-deployment Verification
1. Service health checks
2. Database connectivity
3. External service integration
4. Performance monitoring
5. Error rate monitoring

## Rollback Criteria

### Automatic Rollback Triggers
- Error rate > 5%
- Response time > 1s (95th percentile)
- Health check failures
- Database connection issues

### Manual Rollback Triggers
- Security vulnerabilities detected
- Data corruption issues
- Performance degradation
- User-reported critical bugs
