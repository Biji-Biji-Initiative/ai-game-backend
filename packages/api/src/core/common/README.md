# API Common Module

This directory contains code shared *within* the API package only. It is not meant to be used directly by other packages in the monorepo.

## Purpose

The `core/common` directory contains:

- **Value Objects**: Rich domain objects with validation and behavior
- **Base Classes**: Foundational classes like Entity
- **Events**: Domain event definitions and handling
- **Models**: Shared models used across different domains in the API

## Important Notes

1. This directory is for internal API use only
2. If code needs to be shared with other packages (like ui-tester), consider:
   - Creating a simple representation in the `@ai-fight-club/shared` package
   - Maintaining the rich domain model here for internal use

## Architecture

This follows Domain-Driven Design principles where:
- Domain models are rich with behavior and validation
- Value objects are immutable and defined by their attributes
- Entity objects have identity and can change over time 
