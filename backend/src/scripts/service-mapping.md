# Service Mapping for DDD-1

## Application Services (Already correctly placed in `src/application/`)

1. **ChallengeGenerationService.js** - `src/application/challenge/ChallengeGenerationService.js`
   - Characteristics: Orchestrates AI interaction, manages external state, coordinates prompt building
   - Dependencies: aiClient, aiStateManager, openAIConfig
   - Properly located in application layer

2. **ChallengeEvaluationService.js** - `src/application/challenge/ChallengeEvaluationService.js`
   - Characteristics: Coordinates evaluation using AI, manages streaming, orchestrates across domains
   - Dependencies: aiClient, aiStateManager, openAIConfig
   - Properly located in application layer

3. **UserContextService.js** - `src/application/evaluation/UserContextService.js`
   - Characteristics: Coordinates data gathering from multiple repositories, handles caching
   - Dependencies: userRepository, challengeRepository, evaluationRepository, cacheService
   - Properly located in application layer

## Domain Services (Currently in `src/core/<domain>/services/`)

1. **TraitsAnalysisService.js** - `src/core/personality/services/TraitsAnalysisService.js`
   - Characteristics: Pure domain logic on personality traits, stateless operations
   - Functions: computeDominantTraits, identifyTraitClusters, analyzeAiAttitudes
   - Properly located in core domain layer

## Services to Review

Search for additional services that may need reorganization:

1. Services in `src/core/` that have infrastructure dependencies (AI, Cache, DB) should be moved to `src/application/`
2. Services in `src/application/` that contain pure domain logic should be moved to `src/core/`

## Standardization Actions

1. Update JSDoc comments for all services to clarify if they are "Application Service" or "Domain Service"
2. Create missing `services/` directories in application subfolders
3. Ensure consistent naming convention: 
   - Domain services: Focus on domain concepts (e.g., TraitsAnalysisService)
   - Application services: Focus on operations/use cases (e.g., ChallengeGenerationService)

## Directory Structure Standardization

```
src/
├── application/
│   ├── <domain>/
│   │   └── services/
│   │       └── <ApplicationService>.js
│   └── coordinators/
│       └── <Coordinator>.js
└── core/
    └── <domain>/
        └── services/
            └── <DomainService>.js
``` 