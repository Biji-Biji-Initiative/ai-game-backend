# Domain Events Implementation Plan

This document outlines the step-by-step plan for implementing our standardized domain event handling pattern across the entire codebase. We'll systematically migrate all direct event publishing to use the entity-based collection approach.

## Implementation Steps

### Phase 1: Core Infrastructure (Completed)
- ✅ Update `Entity` base class with standardized event structure
- ✅ Update `RobustEventBus` to enforce standardized event format
- ✅ Update `BaseRepository._publishDomainEvents()` to handle the new structure
- ✅ Create documentation and migration guides

### Phase 2: Update Domain Entity Models
1. Update all domain entities to extend the `Entity` base class:
   - [ ] User domain: `User.js`, `UserPreferences.js`, etc.
   - [ ] Challenge domain: `Challenge.js`, `ChallengeResponse.js`, etc.
   - [ ] Evaluation domain: `Evaluation.js`, etc.
   - [ ] FocusArea domain: `FocusArea.js`, etc.
   - [ ] Progress domain: `Progress.js`, `Achievement.js`, etc.
   - [ ] Personality domain: `Personality.js`, etc.
   - [ ] UserJourney domain: `UserJourneyEvent.js`, etc.

2. Add domain events to entity methods for all state changes
   - [ ] Add events to User methods (create, update, activate, deactivate, etc.)
   - [ ] Add events to Challenge methods (create, update, submit, evaluate, etc.)
   - [ ] Add events to FocusArea methods (create, update, assign, etc.)
   - [ ] Continue for all domain entities

### Phase 3: Update Repositories
1. Update all repositories to follow the standardized pattern:
   - [ ] UserRepository: collect and publish domain events
   - [ ] ChallengeRepository: collect and publish domain events
   - [ ] EvaluationRepository: collect and publish domain events
   - [ ] FocusAreaRepository: collect and publish domain events
   - [ ] ProgressRepository: collect and publish domain events
   - [ ] Continue for all repositories

2. Remove any direct event publishing from repositories
   - [ ] Replace `eventBus.publish(event.type, event.payload)` with returning domain events

### Phase 4: Update Services and Coordinators
1. Modify services to use entity methods for state changes:
   - [ ] UserService: use entity methods with domain events
   - [ ] ChallengeService: use entity methods with domain events
   - [ ] EvaluationService: use entity methods with domain events
   - [ ] FocusAreaService: use entity methods with domain events
   - [ ] Continue for all services

2. Update coordinators:
   - [ ] FocusAreaManagementCoordinator: replace direct publishing
   - [ ] FocusAreaGenerationCoordinator: replace direct publishing
   - [ ] ProgressCoordinator: replace direct publishing
   - [ ] Continue for all coordinators

### Phase 5: Update Event Handlers
1. Update all event subscription handlers:
   - [ ] Update handlers to use the new standardized event structure
   - [ ] Update access patterns from `event` to `event.data` and `event.metadata`

### Phase 6: Update Tests
1. Update test mocks:
   - [ ] Update the event bus mock to accept standardized format
   - [ ] Update assertions to check for correct event structure

2. Update tests to verify correct event publishing:
   - [ ] Add tests to verify entities emit correct events
   - [ ] Update service tests to verify correct event collection
   - [ ] Update repository tests to verify correct event publishing

## Migration Strategy

We'll follow this migration approach to minimize disruption:

1. **Bottom-up Approach**:
   - First update the entities and repositories
   - Then update the services that use these components
   - Finally update the coordinators and top-level components

2. **Domain-by-Domain Implementation**:
   - Complete one domain at a time (e.g., User domain, then Challenge domain)
   - Test each domain thoroughly before moving to the next
   - This allows for controlled rollout and easier troubleshooting

3. **Cut-over Plan**:
   - For each domain, we'll implement the entity-based approach
   - Test both approaches in parallel where needed
   - Once tested, remove the direct event publishing code

## Task Assignments and Timeline

### Week 1: Core Domains
- Days 1-2: User domain implementation
- Days 3-4: Challenge domain implementation
- Day 5: Focus Area domain implementation

### Week 2: Supporting Domains
- Days 1-2: Evaluation domain implementation
- Days 3-4: Progress domain implementation
- Day 5: Personality domain implementation

### Week 3: Final Domains and Testing
- Days 1-2: User Journey and any remaining domains
- Days 3-4: Comprehensive testing and bug fixing
- Day 5: Final validation and documentation updates

## Verification Steps

For each domain, verify:
1. Entities correctly add domain events
2. Repositories correctly collect and publish events
3. Services correctly use entity methods
4. Event handlers correctly process the standardized format
5. Tests pass and verify correct event structure

## Rollback Plan

In case of issues:
1. The BaseRepository can temporarily support both formats
2. We can restore backward compatibility in RobustEventBus if needed
3. We can revert to direct publishing in specific problematic areas

By following this structured approach, we'll ensure a smooth transition to the standardized domain event handling pattern across the entire codebase. 