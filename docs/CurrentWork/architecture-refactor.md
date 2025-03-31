# DDD-1: Clarify Domain vs. Application Service Roles

## Current State

The codebase currently has a mix of domain and application services across different directories:

1. **Domain Services** (should be in `src/core/<domain>/services/`):
   - `TraitsAnalysisService.js` (correctly placed in `src/core/personality/services/`)
   - Others that may primarily encapsulate domain logic

2. **Application Services** (should be in `src/application/<domain>/services/`):
   - `ChallengeGenerationService.js` (currently in `src/application/challenge/`)
   - `ChallengeEvaluationService.js` 
   - `UserContextService.js`

## Key Characteristics

### Domain Services
- Focus on pure domain logic
- Stateless operations on domain entities
- No infrastructure dependencies (DB, external APIs, etc.)
- No orchestration of multiple other services
- No transaction management

### Application Services
- Orchestrate between different domains
- Have infrastructure dependencies
- Handle transactions
- Manage external integration (AI, APIs)
- Coordinate between multiple domain services

## Refactoring Plan

1. Create a standard directory structure:
   - Domain Services: `src/core/<domain>/services/`
   - Application Services: `src/application/<domain>/services/`

2. Review and relocate services based on their responsibilities:
   - Move application services currently in core to `src/application/<domain>/services/`
   - Ensure domain services stay in `src/core/<domain>/services/`

3. Update JSDoc comments to clearly identify service type:
   ```js
   /**
    * Challenge Generation Service
    * Application service that handles the generation of challenges using AI.
    */
   ```

4. Update imports/dependencies in coordinator and container files

## Services to Review

1. `ChallengeGenerationService` - Application service (correctly placed)
2. `ChallengeEvaluationService` - Application service (needs verification)
3. `UserContextService` - Application service (needs verification)
4. Other services identified during the refactoring process

## Expected Outcome

- Clear separation between domain and application services
- Consistent directory structure
- Enhanced documentation reflecting DDD concepts
- Easier understanding of service responsibilities 