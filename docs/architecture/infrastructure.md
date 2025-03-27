# Infrastructure Layer

This document describes the infrastructure layer within our Domain-Driven Design architecture, which provides cross-cutting technical capabilities to support all domains.

## Overview

The infrastructure layer is located in `src/core/infra` and contains technical components that are used across multiple domains. These components are not specific to any particular domain, but rather provide foundational capabilities needed by all parts of the application.

## Components

### Database (`/src/core/infra/db`)

This component provides database access utilities and connection management.

**Key Files**:
- `supabaseClient.js` - Manages connections to Supabase database
- `challengeDbMapper.js` - Maps between database records and domain objects

**Responsibilities**:
- Database connection management
- Object-relational mapping
- Query building
- Transaction management

### Logging (`/src/core/infra/logging`)

This component provides centralized logging capabilities.

**Key Files**:
- `logger.js` - Provides logging utilities and middleware

**Responsibilities**:
- Structured logging
- Log level management
- Request logging middleware
- Error logging

### Error Handling (`/src/core/infra/errors`)

This component provides standardized error handling.

**Key Files**:
- `AppError.js` - Domain error class
- `errorHandler.js` - Error handling middleware and utilities

**Responsibilities**:
- Custom error types
- Error formatting
- Global error handling
- Not-found handling

### Dependency Injection (`/src/core/infra/di`)

This component provides a dependency injection container.

**Key Files**:
- `DIContainer.js` - Dependency injection container implementation

**Responsibilities**:
- Service registration
- Service resolution
- Singleton management
- Factory functions

### HTTP Middleware (`/src/core/infra/http/middleware`)

This component provides HTTP middleware for Express.js.

**Key Files**:
- `auth.js` - Authentication and authorization middleware

**Responsibilities**:
- Authentication
- Authorization
- Request processing
- Cross-cutting concerns like request ID generation

## Usage Guidelines

### Database Access

Domains should access the database through their repositories, which can use the infrastructure database components. Direct database access from services or controllers is discouraged.

```javascript
// Correct usage in a repository
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');

class UserRepository {
  async findById(id) {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    // Map to domain model and return
  }
}
```

### Logging

Logging should be used consistently throughout the application:

```javascript
const { logger } = require('../../../core/infra/logging/logger');

// Log at appropriate levels
logger.debug('Detailed info for debugging');
logger.info('General information');
logger.warn('Warning condition');
logger.error('Error condition', { error: error.message });
```

### Error Handling

Use the AppError class for domain-specific errors:

```javascript
const AppError = require('../../../core/infra/errors/AppError');

// In a service method
if (!user) {
  throw new AppError('User not found', 404);
}
```

### Dependency Injection

The DI container should be used to register and resolve dependencies:

```javascript
const { container } = require('../../../core/infra/di/DIContainer');

// Register a service
container.register('userService', (c) => {
  const UserService = require('../services/UserService');
  const userRepository = c.get('userRepository');
  return new UserService(userRepository);
}, true);

// Resolve a service
const userService = container.get('userService');
```

### HTTP Middleware

HTTP middleware should be applied in route definitions:

```javascript
const { authenticateUser, requireAdmin } = require('../core/infra/http/middleware/auth');

router.get('/protected', authenticateUser, (req, res) => {
  // Protected route handler
});

router.get('/admin', authenticateUser, requireAdmin, (req, res) => {
  // Admin-only route handler
});
```

## Extending the Infrastructure Layer

When extending the infrastructure layer:

1. Keep components focused on technical concerns, not domain logic
2. Ensure components are reusable across multiple domains
3. Provide clear interfaces and documentation
4. Avoid tight coupling with specific domains
5. Keep backward compatibility in mind
6. Follow the single responsibility principle 