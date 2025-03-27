# Domain-Driven Design Architecture

This document outlines the Domain-Driven Design (DDD) architecture implemented in this application.

## Architecture Layers

The application follows a strict layered architecture based on DDD principles:

### 1. Domain Layer (`/src/core`)

This layer contains the core business logic and domain models.

- **Domain Models** (`/src/core/*/models/`): Encapsulate business rules and data structures
- **Domain Services** (`/src/core/*/services/`): Implement domain logic that doesn't naturally fit in models
- **Repositories** (`/src/core/*/repositories/`): Domain-specific data access interfaces
- **Controllers** (`/src/core/*/controllers/`): Domain-specific HTTP request handlers
- **Domain Events** (`/src/core/shared/domainEvents.js`): Event system for cross-domain communication

### 2. Application Layer (`/src/application`)

This layer orchestrates the flow of data between the user and the domain.

- **Coordinators**: Orchestrate multiple domain services and repositories
- **Use Cases**: Implement specific application-level business flows

### 3. Infrastructure Layer (`/src/core/infra`)

This layer provides technical capabilities to support other layers.

- **Database** (`/src/core/infra/db/`): Database mappers and clients
- **Logging** (`/src/core/infra/logging/`): Logging infrastructure
- **Error Handling** (`/src/core/infra/errors/`): Error management
- **Dependency Injection** (`/src/core/infra/di/`): DI container
- **HTTP Middleware** (`/src/core/infra/http/middleware/`): HTTP middleware components

### 4. External Interfaces Layer (`/src`)

- **API Routes** (`/src/routes/`): HTTP endpoints
- **CLI** (`/src/cli/`): Command-line interface
- **App.js**: Application bootstrap

### 5. External Services (`/src/lib`)

- Integration with external services (OpenAI, Supabase)

## Key DDD Concepts Implemented

1. **Bounded Contexts**: Each subfolder in `/src/core` represents a bounded context
2. **Ubiquitous Language**: Consistent naming across a bounded context
3. **Entities and Value Objects**: Implemented as domain models
4. **Aggregates**: Root entities that guarantee consistency
5. **Repositories**: Persistence abstraction for domain objects
6. **Domain Events**: For cross-domain communication
7. **Domain Services**: For business logic that doesn't fit in models

## Folder Structure

```
src/
├── application/        # Application coordinators
├── cli/                # Command-line interface
├── config/             # Application configuration
├── core/               # Domain layer
│   ├── adaptive/       # Adaptive learning domain
│   │   ├── controllers/  # Domain-specific HTTP controllers
│   │   ├── models/       # Domain models
│   │   ├── repositories/ # Domain repositories
│   │   └── services/     # Domain services
│   ├── challenge/      # Challenge domain
│   ├── evaluation/     # Evaluation domain
│   ├── focusArea/      # Focus area domain
│   ├── infra/          # Infrastructure concerns
│   │   ├── db/         # Database infrastructure
│   │   ├── di/         # Dependency injection
│   │   ├── errors/     # Error handling
│   │   ├── http/       # HTTP infrastructure
│   │   │   └── middleware/ # HTTP middleware
│   │   └── logging/    # Logging infrastructure
│   ├── personality/    # Personality domain
│   ├── progress/       # Progress tracking domain
│   ├── prompt/         # Prompt generation domain
│   ├── shared/         # Shared domain components
│   ├── user/           # User domain
│   └── userJourney/    # User journey domain
├── lib/                # External service clients
│   ├── openai/         # OpenAI integration
│   └── supabase/       # Supabase integration
├── routes/             # API routes
└── scripts/            # Utility scripts
```

## Domain-Driven Migration

This application was migrated from a traditional layered architecture to DDD. The migration involved:

1. Identifying core domains
2. Moving utilities to domain services
3. Implementing proper domain models
4. Creating a layered architecture
5. Establishing clear dependencies

Legacy code is stored in the `.deprecated` directory for reference.

## Best Practices

When developing in this architecture, follow these best practices:

1. **Domain Logic Isolation**: Keep business logic in domain models and domain services
2. **Separation of Concerns**: Maintain clear boundaries between layers
3. **Domain Events**: Use for communication between bounded contexts
4. **Rich Domain Models**: Models should contain behavior, not just data
5. **Clean Dependencies**: Higher layers depend on lower layers, never the reverse
6. **Controllers in Domains**: Controllers belong to their respective domains and handle HTTP requests
7. **Infrastructure Separation**: Keep infrastructure concerns separate from domain logic 