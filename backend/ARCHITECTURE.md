# API Architecture Overview

## Key Architectural Patterns

The API follows a clean architecture approach with the following layers:

1. **Core Domain** - Central business logic and entities
2. **Application** - Coordinates use cases across domains
3. **Infrastructure** - External interfaces (database, API clients, etc.)
4. **Presentation** - API routes and controllers

## Dependency Injection (DI)

We use a custom DI container to manage service instantiation and dependencies. The container:

- Allows both singleton and transient service registration
- Supports asynchronous dependency resolution
- Provides centralized configuration through `container/index.js`

### Component Registration Files

The DI container configuration is split into several modules:

- `constants.js` - Application constants
- `infrastructure.js` - Database, logging, events, cache, etc.
- `repositories.js` - Data access layer
- `services.js` - Business logic
- `ai.js` - AI-specific components
- `coordinators.js` - Application-level coordinators
- `controllers.js` - API controllers

## Route Registration

We use a direct route mounting approach instead of registering routes through the DI container. This change was made to:

1. Simplify route registration and error handling
2. Avoid circular dependencies
3. Provide more explicit control over middleware ordering

The route mounting logic is implemented in `config/setup/directRoutes.js`, which:

- Directly accesses controllers from the container
- Explicitly mounts each route module on the appropriate path
- Provides fallback routes if dependency resolution fails

## Health Checks

The API includes comprehensive health checks for critical dependencies:

- **Database** - Checks connection using a lightweight query
- **OpenAI** - Checks connectivity using a minimal API call

Health checks are implemented in the `HealthCheckService` class and exposed via the `/api/health` endpoint.

## Middleware

The primary middleware stack is configured in `config/setup/middleware.js` and includes:

- Security (Helmet, CORS)
- Rate limiting
- Request parsing
- Logging
- Authentication

## Authentication

Authentication is implemented using Supabase and applied globally to all routes under the API prefix. Public routes like `/api/health` and `/api/auth` handle authentication internally.

## Event System

The API uses an event-driven architecture with:

- Event bus for publishing and subscribing to events
- Dead letter queue for handling failed events
- Robust event bus for retries and error handling

## Asynchronous Processing

Many components in the system are asynchronous. Key patterns include:

- Async dependency registration and resolution
- Await-based event handling
- Proper Promise handling throughout the application

## Circular Dependency Handling

Where circular dependencies are unavoidable, we use proxies to break the cycles:

- Example: `challengeConfigServiceProxy` breaks the circular dependency between `ChallengeFactory` and `ChallengeConfigService`

## Logging and Monitoring

The application uses structured logging:

- Child loggers with components/namespaces
- Request correlation IDs
- Performance metrics
- Memory usage monitoring 