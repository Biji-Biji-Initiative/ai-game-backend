# JIRA-18: Refactoring FocusAreaThreadService

## Summary
Successfully refactored the `focusAreaThreadService.js` file that was located in the core/domain layer but was directly interacting with infrastructure concerns. This implementation follows Option 2 from the ticket, using the Ports & Adapters pattern (also known as Hexagonal Architecture) to properly decouple the domain logic from infrastructure details.

## Solution Details

### 1. Created a Port (Interface)
Created a new port interface in the domain layer that defines the contract for thread state management:
- **File**: `/src/core/focusArea/ports/FocusAreaThreadStatePort.js`
- **Purpose**: Defines the abstract interface for thread state management operations
- **Methods**: 
  - `generateContextId(userId)`
  - `createThread(userId, metadata)`
  - `findOrCreateThread(userId, metadata)`
  - `getLastResponseId(threadId)`
  - `updateWithResponseId(threadId, responseId)`

### 2. Created an Adapter Implementation
Implemented an adapter that fulfills the port's contract by leveraging the `OpenAIStateManager`:
- **File**: `/src/core/infra/openai/adapters/FocusAreaThreadStateAdapter.js`
- **Purpose**: Implements the port using the existing `openAIStateManager`
- **Relationship**: The adapter depends on the `openAIStateManager` infrastructure component, but implements the domain-defined port

### 3. Moved Service to Application Layer 
Created a new application layer service that uses the port:
- **File**: `/src/application/focusArea/services/FocusAreaThreadService.js`
- **Purpose**: Orchestrates focus area thread operations by using the port
- **Dependencies**: Depends on abstractions (the port) rather than concrete implementations

### 4. Updated Dependency Injection
Modified the DI container configuration to wire everything together:
- Registered the adapter in `ai.js` container configuration
- Updated the service registration in `services.js` to use the new application layer service
- Configured the service to use the port instead of directly depending on infrastructure

## Benefits

1. **Clean Architecture**: Domain logic no longer depends directly on infrastructure concerns
2. **Testability**: Services can now be tested with mock implementations of the port
3. **Flexibility**: We can easily swap out the implementation of thread state management
4. **Separation of Concerns**: Clear boundaries between application, domain, and infrastructure layers

## Acceptance Criteria Met

✅ The responsibility of managing AI thread state for focus areas is handled outside the core domain layer (via an Infrastructure Adapter)
✅ Domain services in core/focusArea/services no longer have direct dependencies on openAIStateManager or similar infrastructure components 