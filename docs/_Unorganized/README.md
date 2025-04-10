# AI Fight Club API Documentation

Welcome to the comprehensive documentation for the AI Fight Club API, a stateful web application that challenges users with dynamic, AI-generated cognitive challenges.

## Important Update: Consolidated Documentation

We have consolidated all markdown documentation from across the repository into this `/docs` directory. Please see [DOCUMENTATION.md](./DOCUMENTATION.md) for details on how the documentation is organized and how to find what you need.

The documentation preserves its original directory structure, so files from `/src/core/common/` can be found at `/docs/src/core/common/`. A log file of all moved documents is available at [moved_files.log](./moved_files.log).

## Getting Started

- [Setup Guide](../SETUP.md) - How to install and configure the application
- [Quick Start](../QUICK_START.md) - Get up and running quickly
- [Testing](../TESTING.md) - How to run and write tests
- [Deployment](../DEPLOYMENT.md) - How to deploy the application
- [Contributing](../CONTRIBUTING.md) - Guidelines for contributing
- [Glossary](../GLOSSARY.md) - Terminology and concepts

## Architecture

The [architecture/](./architecture/) section contains detailed documentation on the design of the system:

- Domain-Driven Design approach
- Layered architecture
- Domain events
- Prompt system
- State management
- [Architectural Decision Records](./architecture/adr/)

## API Reference

The [api/](./api/) section provides comprehensive documentation for the API endpoints:

- Authentication and authorization
- User API
- Personality API
- Challenge API 
- Focus Area API
- Evaluation API

## Domain Documentation

The [domains/](./domains/) section contains detailed information about each domain:

- Challenge Domain
- User Domain
- Evaluation Domain
- Focus Area Domain
- Personality Domain
- Progress Domain

## Workflows

The [workflows/](./workflows/) section illustrates key end-to-end processes:

- User onboarding and first challenge generation
- Challenge lifecycle from creation to evaluation

## External API Integration

The [external-apis/](./external-apis/) section documents integration with external services:

- OpenAI Responses API
- Supabase

## Backend Documentation

Welcome to the backend documentation. This directory contains detailed information about the backend architecture, components, and development guidelines.

### Recently Updated Documentation

- **[Caching Architecture](./caching-architecture.md)** - Comprehensive guide to our centralized caching system with Redis and in-memory providers

### Architecture Documentation

- [Overview](./architecture/overview.md) - High-level architecture overview
- [API Design](./architecture/api-design.md) - API design principles and standards
- [Error Handling](./architecture/error-handling.md) - Standard error handling practices
- [Authentication](./architecture/authentication.md) - Authentication implementation details
- [Authorization](./architecture/authorization.md) - Authorization model and implementation
- [Security](./architecture/security.md) - Security architecture and best practices
- [Dependency Injection](./architecture/dependency-injection.md) - DI approach and best practices
  - [DI Container Guidelines](./architecture/DIContainerGuidelines.md) - When to use singletons and other DI best practices 
  - [DI Container Examples](./architecture/DIContainerExamples.md) - Practical examples of using the DI container
- [Value Objects](./architecture/value-objects.md) - Value Objects and standardized patterns
- [Data Model](./architecture/data-model.md) - Database schema and relationships
- [Core Business Logic](./architecture/core-business-logic.md) - Domain models, aggregates, entities, and repositories
- [Event System](./architecture/event-system.md) - How the event system works
- [Result Pattern](./architecture/result-pattern.md) - Result pattern for error handling
- [Service Layer](./architecture/service-layer.md) - Application services and use cases
- [Swagger Configuration](./architecture/swagger-configuration.md) - API documentation setup and configuration

### Domain Documentation

- [User Domain](./domains/user-domain.md) - User management and related features
- [Challenge Domain](./domains/challenge-domain.md) - Challenge management and logic
- [Evaluation Domain](./domains/evaluation-domain.md) - Evaluation system and criteria
- [Focus Area Domain](./domains/focus-area-domain.md) - Focus area management
- [Personality Domain](./domains/personality-domain.md) - Personality traits and analysis

### API Documentation

- [API Overview](./api/overview.md) - API principles and usage
- [User API](./api/user-api.md) - User-related endpoints
- [Challenge API](./api/challenge-api.md) - Challenge-related endpoints
- [Evaluation API](./api/evaluation-api.md) - Evaluation-related endpoints
- [Focus Area API](./api/focus-area-api.md) - Focus area-related endpoints
- [Personality API](./api/personality-api.md) - Personality-related endpoints

### Development Guidelines

- [Coding Standards](./coding-standards.md) - Code style and best practices
- [Testing Strategy](./testing-strategy.md) - Testing approach and guidelines
- [Import Conventions](./IMPORT_CONVENTIONS.md) - Import path conventions

### External Services

- [External APIs](./external-apis/README.md) - Integration with external services

### Workflows

- [Development Workflow](./workflows/development.md) - Development process
- [Deployment Workflow](./workflows/deployment.md) - Deployment process and environments
- [CI Workflow Security](./workflows/ci-workflow.md) - CI workflow security considerations and implementation

### Refactoring

- [Refactoring Guide](./refactoring/README.md) - Guidelines for refactoring code

### Contributing

Please follow the [contributing guidelines](../CONTRIBUTING.md) when making changes to the documentation.
