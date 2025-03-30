# Ticket 8: Service Layer Placement Analysis

## Overview
This document analyzes services currently placed in the domain layer (`src/core/*/services`) to determine which ones should be relocated to the application layer (`src/application`) based on their responsibilities and adherence to Domain-Driven Design principles.

## Guiding Principles

### Domain Services Should:
- Focus on pure business logic and rules
- Not orchestrate between multiple domain objects/repositories
- Be stateless and free of cross-domain dependencies
- Not handle application-specific use cases

### Application Services Should:
- Orchestrate operations across multiple domains
- Implement specific application use cases
- Coordinate between multiple domain services
- Handle cross-domain workflows

## Services to Relocate

Based on the analysis, the following services should be moved from the domain layer to the application layer:

### 1. `src/core/focusArea/services/focusAreaGenerationService.js`

**Reasons:**
- Orchestrates between multiple domains (user, challenge, progress)
- Handles complex application-specific workflow rather than pure domain logic
- Relies on external services (OpenAI) for core functionality
- Coordinates cross-domain data (user profiles, challenge history, progress data)

**Recommended Path:** `src/application/focusArea/FocusAreaGenerationService.js`

### 2. `src/core/challenge/services/challengeGenerationService.js`

**Reasons:**
- Orchestrates workflow between user context and challenge domain
- Handles application-specific use case (generating challenges for users)
- Uses external services (AI client) for core functionality
- Manages cross-domain state (conversation state for users)

**Recommended Path:** `src/application/challenge/ChallengeGenerationService.js`

### 3. `src/core/challenge/services/challengeEvaluationService.js`

**Reasons:**
- Similar to the generation service, this handles application-specific workflow
- Coordinates between challenge domain and external AI services
- Manages conversation state which is application-specific
- Implements a use case rather than pure domain logic

**Recommended Path:** `src/application/challenge/ChallengeEvaluationService.js`

### 4. `src/core/evaluation/services/userContextService.js`

**Reasons:**
- Aggregates data across multiple domains (user, challenge, evaluation)
- Primary purpose is gathering context for a specific use case
- Not a pure domain service as it crosses domain boundaries
- Functions as a coordinator between domains

**Recommended Path:** `src/application/evaluation/UserContextService.js`

## Borderline Services

The following services were analyzed but determined to belong in the domain layer:

### 1. `src/core/challenge/services/ChallengePersonalizationService.js`

**Rationale for Keeping in Domain:**
- Primarily implements business rules for personalizing challenges
- Does not coordinate across multiple domains
- Maintains a narrow focus on challenge personalization logic
- Contains domain-specific business rules

### 2. `src/core/challenge/services/ChallengeConfigService.js`

**Rationale for Keeping in Domain:**
- Provides access to configuration data specific to the challenge domain
- Does not orchestrate across domains
- Implements challenge-specific business rules and calculations
- Maintains state that is relevant only to the challenge domain

## Implementation Steps

For each service being relocated:

1. Create the appropriate directory structure in `src/application` if it doesn't exist
2. Move the service file to the new location
3. Update import paths in the service file
4. Update all files that import the service
5. Update the dependency injection container registration in `src/config/container/services.js`

## Testing Considerations

After moving the services:

1. Ensure all unit tests for the services still work
2. Test application flows that use these services
3. Verify that dependency injection still works correctly
4. Check that error handling remains consistent 