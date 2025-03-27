# Application Layer

This directory contains the application-level coordinators in our Domain-Driven Design (DDD) architecture.

## Purpose

The application layer is responsible for:

1. **Orchestrating domain services**: These coordinators invoke and coordinate multiple domain services from different domains to fulfill business use cases.

2. **Cross-domain coordination**: They handle operations that span multiple domains, acting as the glue between different bounded contexts.

3. **Transaction boundaries**: Defining transaction boundaries and ensuring consistency across multiple domain operations.

4. **External interfaces**: Providing an API to external systems (like controllers or API routes) that handles cross-domain concerns.

## Key Components

### ChallengeCoordinator
Orchestrates the generation, evaluation, and management of challenges by delegating to domain services in the challenge domain.

### FocusAreaCoordinator
Coordinates operations related to focus areas across user, progress, and other domains.

### UserJourneyCoordinator
Manages the tracking and analysis of user progression through the platform, interacting with multiple domain repositories and services.

## Architecture Pattern

These coordinators follow the application service pattern from DDD:

```
Controller/API -> Application Coordinator -> Multiple Domain Services -> Domain Repositories
                         |                          |                         |
                     Orchestration           Domain Logic              Data Access
```

The application layer doesn't contain business logic - that lives in the domain services. Instead, it coordinates domain services and repositories to implement use cases that span multiple domains. 