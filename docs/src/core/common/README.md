# Common Components

This directory contains common code that is shared across multiple domains. It provides cross-cutting functionality that adheres to Domain-Driven Design principles by not containing any domain-specific logic.

## Directory Structure

- **models/** - Contains base model classes and utility classes for domain entities
- **events/** - Contains event infrastructure for domain events

## Components

### Models

- **Entity.js** - Base class for all domain entities with common functionality like ID generation and domain event handling

### Events

- **domainEvents.js** - Event bus implementation for publishing and subscribing to domain events, central event type registry

## Architectural Purpose

The `common` directory is distinct from the `shared` directory. While `shared` should only contain cross-domain abstractions and interfaces, `common` can contain concrete implementations that are used across domains but don't belong to any single domain.

Components in this directory:

1. Should not contain domain-specific logic
2. Should provide infrastructure and utility functionality
3. Should be stable and change infrequently

## Migration Note

As part of CODE-04 architecture improvement, domain-specific interfaces were removed from the `shared` directory and properly categorized in this `common` directory. The old files in `shared` now act as compatibility layers that forward to these new implementations.

For new code, always import directly from the `common` directory paths. 