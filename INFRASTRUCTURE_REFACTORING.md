# Infrastructure Refactoring

## Overview

This document describes the infrastructure reorganization to follow Domain-Driven Design (DDD) principles more closely. The refactoring consolidates previously fragmented infrastructure code into a coherent structure.

## Directory Structure

The consolidated infrastructure now follows this structure:

```
/src/core/
  /domain/          # Domain models, entities, value objects
  /application/     # Application services, use cases, coordinators
  /infrastructure/  # Infrastructure components
    /api/           # API clients and interfaces
    /di/            # Dependency injection
    /errors/        # Error handling
    /http/          # HTTP-related (routes, middleware)
    /logging/       # Logging infrastructure
    /messaging/     # Event bus, domain events
    /openai/        # OpenAI integration services
    /persistence/   # Database, repositories implementations
    /services/      # Infrastructure services
```

## Key Changes

1. **Consolidated Directories**: Combined code from `/src/infrastructure`, `/src/infra`, and `/src/core/infra` into `/src/core/infrastructure/`

2. **Naming Conventions**:
   - Service implementations: camelCase (`personalityService`)
   - Constants/Enums: camelCase for consistency (`eventTypes` instead of `EventTypes`)
   - Imports should match registration names exactly

3. **Dependency Injection**:
   - Enhanced DIContainer to support both `get()` and `resolve()` methods
   - Added name normalization to lowercase for case-insensitive lookups
   - Services are registered with lowercase names for consistency

4. **Domain Events**:
   - Moved the domain events system to `/infrastructure/messaging/`
   - Standardized naming to use camelCase (`eventTypes` instead of `EventTypes`)

## Import Path Updates

When updating code to use the new structure, use these import paths:

```javascript
// Old paths
const { logger } = require('../../infra/logging/logger');
const AppError = require('../../infra/errors/AppError');
const { formatForResponsesApi } = require('../../infra/openai/messageFormatter');
const { EventTypes } = require('../../common/events/domainEvents');

// New paths
const { logger } = require('../../infrastructure/logging/logger');
const AppError = require('../../infrastructure/errors/AppError');
const { formatForResponsesApi } = require('../../infrastructure/openai/messageFormatter');
const { eventTypes } = require('../../infrastructure/messaging/domainEvents');
```

## Benefits

This reorganization:

1. **Improves Maintainability**: Clearer separation between domain, application, and infrastructure
2. **Reduces Duplication**: Consolidates similar code that was spread across multiple directories
3. **Ensures Consistency**: Standardizes naming conventions and file organization
4. **Makes DDD Principles Explicit**: Clear boundaries between layers of the architecture

## Future Improvements

1. **Consolidate Dependencies**: Use the new structure for all new code
2. **Standardize Error Handling**: Implement consistent error handling across domains
3. **Improve Event Bus**: Consider adding more features like event replay, persistence
4. **Add Infrastructure Tests**: Improve test coverage of infrastructure components 