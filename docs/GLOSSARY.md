# Glossary

This document provides definitions for terminology used throughout the AI Fight Club API codebase and documentation.

## Domain-Driven Design (DDD) Terminology

### Aggregate
A cluster of domain objects that can be treated as a single unit. An aggregate has a root entity (aggregate root) and boundary.

### Aggregate Root
The main entity in an aggregate that ensures the consistency of changes being made within the aggregate.

### Anti-Corruption Layer (ACL)
A layer that translates between different models, often used when integrating with external systems.

### Bounded Context
A specific responsibility with explicit boundaries that separate it from other parts of the system. Each bounded context has its own domain model.

### Domain Events
Events that domain experts care about, representing something that happened in the domain.

### Domain Model
A model that incorporates both behavior and data, capturing the core domain concepts.

### Entity
An object defined primarily by its identity rather than its attributes.

### Repository
A mechanism for encapsulating storage, retrieval, and search behavior for domain objects.

### Service
A class that provides domain functionality not naturally belonging to a domain object.

### Ubiquitous Language
A common, rigorous language between developers and domain experts, used throughout the system.

### Value Object
An immutable object defined by its attributes rather than its identity.

## Application-Specific Terminology

### Challenge
A cognitive task designed to test a user's abilities in a specific area, generated based on their profile and focus area.

### Evaluation
The assessment of a user's response to a challenge, providing feedback and scoring.

### Focus Area
A topic or subject area that a user is interested in or can benefit from, such as "AI Ethics" or "Creative Problem Solving".

### Personality Trait
A characteristic or quality measured in users, such as creativity, analytical thinking, or empathy.

### AI Attitude
A user's stance or opinion about artificial intelligence, measured in dimensions like trust, job concerns, and impact.

### Prompt Builder
A system component that constructs prompts for the AI model based on context and purpose.

### Prompt Strategy
A specific approach to constructing an AI prompt for a particular use case, such as challenge generation or evaluation.

### User Journey
The sequence of interactions a user has with the system, from onboarding through challenge completion.

## Technical Terminology

### Coordinator
An application service that orchestrates multiple domain operations, often spanning multiple bounded contexts.

### Dependency Injection (DI)
A technique where an object receives other objects it depends on, rather than creating them internally.

### Domain Layer
The core layer containing business rules, domain models, and domain services.

### Infrastructure Layer
The layer that provides technical capabilities to support higher layers, like database access, API clients, etc.

### Middleware
Software components that intercept API requests to perform common functions like authentication, logging, etc.

### Responses API
OpenAI's API for generating AI responses, used exclusively in this project for all AI interactions.

### Supabase
A Firebase alternative providing a PostgreSQL database, authentication, and storage used by this application.

### Repository Pattern
A design pattern that mediates between the domain and data mapping layers, providing data access abstraction.

### Service Locator
A design pattern that provides a central registry for services and dependencies.

### Zod Schema
A TypeScript-first schema validation library used to validate data structures. 