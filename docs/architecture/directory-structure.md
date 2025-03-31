# Directory Structure Proposal

## Current Structure

```
src/
├── application/          # Application services/coordinators
├── config/               # Configuration files
├── core/                 # Core domain code
│   ├── adaptive/         # Adaptive learning logic
│   ├── ai/               # AI integration
│   ├── auth/             # Authentication logic
│   ├── challenge/        # Challenge domain
│   ├── common/           # Common/shared concepts
│   ├── evaluation/       # Evaluation domain
│   ├── focusArea/        # Focus area domain
│   ├── infra/            # Infrastructure concerns
│   ├── personality/      # Personality domain
│   ├── progress/         # Progress tracking domain
│   ├── prompt/           # Prompt management
│   ├── shared/           # More shared utilities
│   ├── user/             # User domain
│   └── userJourney/      # User journey tracking
├── app.js                # Application setup
├── importResolver.js     # Import resolution logic
├── index.js              # Entry point
└── server.js             # Server configuration
```

## Issues with Current Structure

1. **Mixture of Concerns**: The `core` directory mixes domain logic (user, challenge) with infrastructure concerns (infra, ai) and shared utilities (common, shared).

2. **Unclear Boundaries**: There's no clear separation between domain logic, infrastructure, and application services within the core directory.

3. **Redundant Shared Folders**: Both `common` and `shared` directories exist for seemingly similar purposes.

4. **Inconsistent BCs**: Some bounded contexts are in both `core` (domain logic) and `application` (coordinators), while others are only in `core`.

## Proposed Structure

```
src/
├── domain/              # Domain logic organized by Bounded Context
│   ├── challenge/       # Challenge bounded context
│   ├── evaluation/      # Evaluation bounded context
│   ├── focusArea/       # Focus area bounded context
│   ├── personality/     # Personality bounded context
│   ├── progress/        # Progress tracking bounded context
│   ├── user/            # User bounded context
│   └── userJourney/     # User journey bounded context
│
├── application/         # Application services that orchestrate across BCs
│   ├── coordinators/    # Cross-domain coordinators
│   │   ├── BaseCoordinator.js
│   │   ├── ChallengeCoordinator.js
│   │   ├── PersonalityCoordinator.js
│   │   └── UserJourneyCoordinator.js
│   ├── eventHandlers/   # Cross-domain event handlers
│   └── services/        # Organized by domain they orchestrate
│       ├── challenge/   # Challenge-related application services
│       ├── evaluation/  # Evaluation-related application services
│       └── focusArea/   # Focus area-related application services
│
├── infrastructure/      # Technical infrastructure and external concerns
│   ├── ai/              # AI integration
│   ├── auth/            # Authentication infrastructure
│   ├── cache/           # Caching mechanisms
│   ├── db/              # Database connection and clients
│   ├── errors/          # Error handling infrastructure
│   ├── events/          # Event bus implementation
│   ├── logging/         # Logging infrastructure
│   ├── repositories/    # Base repository implementations
│   └── web/             # Web-specific infrastructure
│
├── shared/              # Shared kernel - concepts used across domains
│   ├── models/          # Base models (Entity, Value Object)
│   ├── valueObjects/    # Shared value objects
│   └── utils/           # Common utilities
│
├── config/              # Configuration
│   ├── container/       # Dependency injection container
│   ├── routes/          # API routes configuration
│   ├── swagger/         # API documentation
│   └── app.js           # Application configuration
│
├── app.js               # Application setup
├── server.js            # Server initialization
└── index.js             # Entry point
```

## Migration Plan

### Phase 1: Initial Structure Updates

1. Create the new top-level directories
   - `src/domain/`
   - `src/infrastructure/`
   - `src/shared/`

2. Move infrastructure concerns
   - Move `src/core/infra/` to `src/infrastructure/`
   - Move `src/core/ai/` to `src/infrastructure/ai/`
   - Move `src/core/auth/` to `src/infrastructure/auth/`
   - Move `src/core/prompt/` to `src/infrastructure/ai/prompts/`

3. Consolidate shared concepts
   - Move `src/core/common/` to `src/shared/`
   - Merge `src/core/shared/` into `src/shared/utils/`

### Phase 2: Domain Restructuring

1. Move domain logic
   - Move individual bounded contexts from `src/core/` to `src/domain/`
   - Ensure each bounded context contains only domain logic

2. Review and reorganize application services
   - Create subdirectories in `src/application/` by domain
   - Move coordinators to `src/application/coordinators/`
   - Move event handlers to `src/application/eventHandlers/`
   - Place application services in appropriate domain subdirectories

### Phase 3: Update Imports and Fix References

1. Update import paths throughout the codebase
2. Fix any circular dependencies or reference issues
3. Update tests to reflect new structure
4. Update documentation to reference new paths

## Benefits of New Structure

1. **Clear Separation of Concerns**
   - Domain logic is clearly separated from infrastructure
   - Application services are organized by the domains they orchestrate
   - Shared concepts are explicitly defined in a single location

2. **Alignment with DDD**
   - Structure directly reflects bounded contexts
   - Shared kernel is explicitly defined
   - Domain logic is isolated from infrastructure concerns

3. **Improved Maintainability**
   - Easier to find related code
   - Clearer boundaries between components
   - Reduced risk of creating inappropriate dependencies

4. **Better Scalability**
   - Structure supports growing the application
   - New bounded contexts can be added easily
   - Future microservice extraction is simplified

## Implementation Considerations

1. **Backward Compatibility**
   - Ensure existing code continues to work during migration
   - Use import aliases to reduce the impact of path changes

2. **Incremental Approach**
   - Implement changes in phases to minimize disruption
   - Fully test after each phase of migration

3. **Documentation Updates**
   - Update architecture documentation to reflect new structure
   - Provide migration guides for developers 