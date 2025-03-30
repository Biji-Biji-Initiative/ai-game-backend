# Architecture Documentation

This directory contains comprehensive documentation about the architecture of our application.

## Core Architecture Documents

- [DDD Principles](./ddd-principles.md) - Overview of Domain-Driven Design principles used in the application
- [Layered Architecture](./application-layer.md) - Details on the application's layered architecture
- [Dependency Injection](./dependency-injection.md) - Guide to our DI approach and container implementation
- [Error Handling](./error-handling.md) - Standardized error handling across the application
- [Logging](./logging.md) - Logging architecture and best practices

## Domain Model Patterns

- [Domain Events](./domain-events.md) - Event-driven communication between domains
- [Value Objects](./value-objects.md) - Working with immutable value objects
- [Entities](./entities.md) - Entity design and identity management
- [Repositories](./repositories.md) - Data access abstraction with the repository pattern
- [Aggregates](./aggregates.md) - Consistency boundaries and transaction management

## Domain Structure

- [Domain Structure](./domain-structure.md) - Overview of the domain structure
- [Missing Domains](./missing-domains.md) - Documentation for domains not covered in the main structure
- [Domain Relationships](./domain-relationships.md) - How domains interact and depend on each other
- [Domain Boundaries](./domain-boundaries.md) - Guidelines for maintaining strong domain boundaries
- [Domain Decisions](./domain-decisions.md) - Record of key architectural decisions for each domain
- [Domain Evolution](./domain-evolution.md) - How domains are expected to evolve over time
- [Enhanced Domain Events](./enhanced-domain-events.md) - Detailed examples of domain events and their usage

## Infrastructure

- [Infrastructure](./infrastructure.md) - Core infrastructure components
- [Infra Extended](./infra-extended.md) - Documentation for additional infrastructure components
- [Persistence](./persistence.md) - Database design and data access patterns
- [API Design](./api-design.md) - REST API design principles and patterns
- [Security](./security.md) - Authentication, authorization, and security practices

## Architecture Analysis

- [Architecture Review](../ARCHITECTURE_REVIEW.md) - Comprehensive review of architecture documentation vs. implementation
- [Architecture Decision Records](./adr/) - Collection of architecture decision records

## Getting Started

If you're new to the codebase, we recommend starting with these documents:

1. First, read the [DDD Principles](./ddd-principles.md) document to understand our approach
2. Then, explore the [Domain Structure](./domain-structure.md) to get an overview of the system
3. Next, check the [Domain Relationships](./domain-relationships.md) to understand how domains interact
4. Finally, look at the [Application Layer](./application-layer.md) to see how it all comes together

## Contributing to Architecture

When contributing to the architecture documentation:

1. Follow the established formats for consistency
2. Update diagrams when making structural changes (use the mermaid format)
3. Record significant architectural decisions in the ADR directory
4. Update the domain evolution document when planning future changes
5. Ensure documentation matches implementation (or clearly label as planned/future work) 