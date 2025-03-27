# Architecture Cleanup Plan

## Principles

All changes will strictly adhere to:
- Single Responsibility Principle (SRP)
- DRY (Don't Repeat Yourself)
- Clear interfaces with proper error handling
- No fallback mechanisms (all errors must be thrown with context)
- Exclusive use of OpenAI Responses API
- Consistent camelCase naming conventions
- Complete removal of redundant/deprecated code

## 1. Prompt Builder Refactoring

Implement the refactoring plan from [prompt-builder-refactoring.md](./prompt-builder-refactoring.md):

- Create unified facade in `promptBuilder.js` for all prompt building operations
- Ensure consistent structure and error handling in all prompt builders
- Leverage existing error classes from `/utils/errors/promptGenerationErrors.js`
- Enhance shared formatting utilities in `/utils/prompts/common/formatters.js`
- Consolidate API standards in `/utils/prompts/common/apiStandards.js`

## 2. API Layer Standardization

Enhance the OpenAI client to ensure exclusive use of Responses API:

```
/utils/api
  /openaiClient.js (standardized interface for OpenAI Responses API calls)
  /responsesApiTypes.js (Types and interfaces for Responses API)
  /errors.js (API-specific error handling - leverage existing error classes)
```

Ensure consistent thread management across all API calls.

## 3. DataUtils Modularization

Refactor `dataUtils.js` into domain-specific modules as mentioned in the memories:

```
/utils
  /user
    /traitUtils.js (personality trait analysis)
  /challenge
    /challengeUtils.js (challenge generation utilities)
  /performance
    /performanceMetrics.js (user performance analysis)
```

Maintain backward compatibility through a facade pattern if necessary.

## 4. Error Handling Standardization

Leverage and extend the existing error handling architecture:

1. Use the existing error classes in `/utils/errors/`
2. Ensure all functions validate inputs and throw appropriate errors
3. Maintain the strict "no fallbacks" approach - all errors must be thrown with context
4. Add missing error types if needed for specific domains
5. Ensure consistent error logging patterns

## 5. Implementation Plan

1. Create git branch `refactor/architecture-cleanup` ✅
2. Create architecture documentation ✅
3. Implement prompt builder facade
4. Update openaiClient.js to ensure exclusive use of Responses API
5. Modularize dataUtils.js
6. Clean up any remaining utility modules
7. Update affected imports across codebase
8. Remove redundant/deprecated code
9. Run tests to verify functionality
10. Create PR for review

## Key Technical Considerations

### Thread Management
- Always create, persist, and retrieve thread IDs via user records
- Use consistent thread management across all API interactions
- Strictly validate thread continuity in interactions

### API Usage
- **ALWAYS** use OpenAI Responses API exclusively
- **NEVER** use Chat Completions API for any implementation
- Always leverage conversation threads for stateful interactions

### Error Handling
- **ALWAYS** throw errors when encountering exceptional conditions
- **NEVER** implement fallback mechanisms or silent failure modes
- Errors must be specific, descriptive, and include context about the failure

### Code Organization
- Follow SOLID principles, particularly Single Responsibility
- Each module should focus on a specific feature area
- Maintain clear separation between UI logic, API interaction, and data operations
