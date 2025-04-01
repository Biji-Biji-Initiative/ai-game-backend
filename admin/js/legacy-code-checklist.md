# Legacy Code Migration Checklist

This checklist identifies the remaining functionality in `main.ts` that needs to be migrated to the new modular architecture.

## Core Functionality to Migrate

- [x] Logger functionality (lines ~250-500)
  - Completed with `utils/logger.ts` module
  - Functions: log, debug, info, warn, error, sendToServer, getFilteredFrontendLogs, renderFrontendLogs

- [x] Domain Event handling (lines ~490-560)
  - Functions: isDomainEventLog, formatDomainEventDetails
  - Completed with `modules/domain-event-manager.ts`

- [x] Flow functionality
  - Controllers for flow management
  - Flow rendering and UI interaction
  - Implemented in `modules/flow-manager.ts`

- [x] Step execution logic
  - runStep function and related execution logic
  - Form handling for step parameters
  - Request execution and response handling
  - Implemented as part of FlowManager in flow-manager.ts

- [x] Theme management
  - Dark/light mode toggling implemented in UIManager
  - Theme persistence using localStorage

- [x] Error handling functions
  - showError function implemented in UIManager
  - Error panel management implemented in UIManager

- [x] JWT/Authentication handling
  - Token management
  - Interceptors for authenticated requests
  - Implemented in `modules/auth-manager.ts`

## UI Interaction Functions

- [x] Event handlers for UI components
  - Implemented in UIManager and component event listeners
  - Tab switching functionality
  - Panel visibility toggles

- [x] Form generation and validation
  - Functions for generating form inputs from schemas
  - Form validation logic
  - Implemented in `utils/form-utils.ts` with TypeScript support

- [x] DOM manipulation utilities
  - Element creation helpers moved to dom-utils.ts
  - DOM update functions moved to dom-utils.ts

## Integration Points

- [x] Initialization sequence
  - Proper bootstrapping of all modules in index.ts
  - Event wiring between components

- [x] Communication between modules
  - Events and callbacks implemented with component methods
  - State sharing through configuration and cross-component references

## Completed Migrations

- [x] EndpointManager integration
- [x] VariableManager integration
- [x] ResponseViewer component 
- [x] DomainStateManager and viewer
- [x] Main application structure (AppController)
- [x] Configuration handling
- [x] UIManager implementation with UIManagerAdapter for legacy compatibility
- [x] Main entry point refactored to use TypeScript modules
- [x] DomainEventManager implementation
- [x] FlowManager implementation
- [x] AuthManager for JWT handling
- [x] Form utilities with TypeScript support

## Next Steps

1. ✅ Remove deprecated imports in main.ts (.js extensions) - Created main-new.ts with proper imports
2. ✅ Extract core UI components - Created UIManager and UIManagerAdapter 
3. ✅ Migrate Domain Event handling to proper module
4. ✅ Complete the Flow and Step execution logic migration
5. ✅ Set up JWT/Authentication handling
6. ✅ Handle form generation and validation with proper TypeScript
7. ✅ Eventually replace main.ts with index.ts once migration is complete

## Implementation Strategy

For the remaining functionality, we should follow these steps:

1. ✅ Identify the section of code to migrate
2. ✅ Create a new TypeScript module with proper interfaces
3. ✅ Move the functionality to the new module
4. ✅ Create an adapter if needed for backward compatibility
5. ✅ Update the main-new.ts to use the new module
6. ✅ Test thoroughly
7. ❌ Replace main.ts with index.ts - This should be done after comprehensive testing 