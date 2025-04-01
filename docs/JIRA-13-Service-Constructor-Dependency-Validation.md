# JIRA-13: Remove Mock Fallbacks in Production Service Constructors

## Solution Overview

This PR implements a solution for JIRA-13 to prevent services from starting with mock repositories in production environments. The issue was found in the constructor of `ChallengeService` (and potentially other services) where dependencies would fall back to mock implementations if the real ones weren't provided.

## Implementation Details

1. Created a `ConfigurationError` class for handling dependency injection issues
2. Added a `validateDependencies` helper function to consistently check for required dependencies
3. Updated `ChallengeService` constructor to fail fast in production when required dependencies are missing
4. Maintained mock fallbacks in development and test environments for easier local development

## How to Apply This Fix to Other Services

### 1. Import the ConfigurationError and validateDependencies

```javascript
import ConfigurationError, { validateDependencies } from "../../infra/errors/ConfigurationError.js";
```

### 2. Update Service Constructor

```javascript
constructor(dependencies = {}) {
  // Extract dependencies
  const { someRepository, someService, logger } = dependencies;
  
  // Validate required dependencies in production
  validateDependencies(
    dependencies,
    ['someRepository', 'someService'], // List required dependencies here
    { serviceName: 'YourServiceName', isProd: true }
  );
  
  // In production, dependencies are guaranteed by validation above
  if (process.env.NODE_ENV === 'production') {
    this.repository = someRepository;
    this.logger = logger || console;
    this.someService = someService;
    this.logger.info('YourServiceName initialized in production mode with real dependencies');
  } else {
    // In development/testing, allow mock fallbacks for easier development
    this.repository = someRepository || {
      // Mock implementation for development/testing
      findById: () => Promise.resolve(null),
      // ...other methods
    };
    
    // Set other dependencies, allowing fallbacks for dev/test
    this.someService = someService || { /* mock service */ };
    this.logger = logger || console;
    
    this.logger.info('YourServiceName running in development mode');
  }
  
  // Rest of constructor...
}
```

## List of Services to Verify and Update

The following services may have similar issues and should be verified:

- [x] ChallengeService *(fixed in this PR)*
- [ ] UserService
- [ ] AuthService
- [ ] FocusAreaService
- [ ] EvaluationService
- [ ] ProgressService
- [ ] PersonalityService
- [ ] Any other service with dependency injection

## Testing

1. Verify that the service initializes properly in development mode with fallbacks
2. Verify that the service throws ConfigurationError in production mode when missing dependencies
3. Ensure unit tests still pass with proper dependency injection

## Related Issues

- JIRA-13 (Robustness): Remove Mock Fallbacks in Production Service Constructors 