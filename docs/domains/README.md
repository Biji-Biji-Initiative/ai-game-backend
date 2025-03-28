# Domain Documentation

This directory contains detailed documentation for each domain in the application.

## Purpose

The domain documentation provides in-depth information about domain models, business rules, and implementation details for each bounded context in the system.

## Domain Structure

Each domain represents a bounded context within the DDD architecture:

- [Challenge Domain](./challenge/README.md) - Cognitive challenges creation and management
- [User Domain](./user/README.md) - User profiles and preferences
- [Evaluation Domain](./evaluation/README.md) - Challenge response evaluation system
- [Focus Area Domain](./focus-area/README.md) - Personalized focus areas
- [Personality Domain](./personality/README.md) - Personality insights and traits
- [Progress Domain](./progress/README.md) - Progress tracking and reporting

## Domain Documentation Format

Each domain directory includes:

1. Domain Model Description - Entities, value objects, and aggregates
2. Business Rules - Core domain rules and invariants
3. Repository Implementation - Data access patterns
4. Service Layer - Domain-specific operations
5. Integration Points - How this domain interacts with others
6. Examples - Sample usage scenarios 