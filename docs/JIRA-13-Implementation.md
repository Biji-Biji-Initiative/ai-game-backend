# JIRA-13: Remove Mock Fallbacks in Production Service Constructors

## Implementation Details

This implementation addresses JIRA-13 by ensuring that services fail fast in production when required dependencies are missing.

### Changes Made:

1. Created a `ConfigurationError` class in `/src/core/infra/errors/ConfigurationError.js`
2. Modified `ChallengeService` constructor to throw a `ConfigurationError` in production when the required `challengeRepository` dependency is missing
3. Maintained the mock fallback pattern for non-production environments (development, testing)

### Code Changes:

The constructor of ChallengeService was updated to include an early check:

```javascript
// Check if we're in production and fail fast if missing dependencies
if (process.env.NODE_ENV === 'production' && !challengeRepository) {
    throw new ConfigurationError('ChallengeRepository is required for ChallengeService in production mode', {
        serviceName: 'ChallengeService',
        dependencyName: 'challengeRepository'
    });
}
```

### Next Steps:

Similar changes should be made to other service constructors that may have similar mock fallback patterns. The same pattern can be applied to:

- UserService
- AuthService
- FocusAreaService
- Any other service with dependency injection

This change ensures that in production, the application fails immediately during initialization if a critical dependency is missing, rather than running with mock implementations which could lead to unpredictable behavior. 