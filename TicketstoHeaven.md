# Tickets to Heaven - Development Tasks

## Ticket 1: Fix Async Usage in BaseCoordinator ✅
- **Label**: [Bug]
- **Priority**: High
- **Files**: src/application/BaseCoordinator.js
- **Description**: The methods executeOperation and executeSecondaryOperations in BaseCoordinator use await internally but are not declared as async functions. This will cause runtime errors or unexpected behavior as await can only be used inside an async function.
- **Acceptance Criteria**:
  - The executeOperation method signature is changed to async executeOperation(...). ✅
  - The executeSecondaryOperations method signature is changed to async executeSecondaryOperations(...). ✅
  - Existing calls to these methods still function correctly. ✅
  - Unit tests (if any) for BaseCoordinator pass. ✅
- **Status**: Completed - Fixed by adding async keyword to both methods that use await.

## Ticket 2: Standardize Value Object Usage in ChallengeCoordinator ✅
- **Label**: [Refactor], [DDD]
- **Priority**: Medium
- **Files**: src/application/ChallengeCoordinator.js, src/core/user/services/UserService.js, src/core/challenge/services/ChallengeService.js
- **Description**: The ChallengeCoordinator uses Value Objects (VOs) like createEmail but then extracts the primitive .value before passing it to services (e.g., this.userService.findByEmail(emailVO.value)). Services should ideally accept VOs directly or handle the conversion internally. This leads to inconsistent VO usage patterns.
- **Acceptance Criteria**:
  - Modify methods in ChallengeCoordinator (like generateAndPersistChallenge, submitChallengeResponse) to pass Value Objects (e.g., emailVO, challengeIdVO) directly to dependent services (userService, challengeService). ✅
  - Update the signatures of the corresponding service methods (UserService.findByEmail, ChallengeService.getChallengeById, etc.) to accept either the VO or the primitive string/ID, performing validation internally. ✅
  - Remove unnecessary .value extractions within the ChallengeCoordinator. ✅
  - Ensure consistent validation logic using VOs occurs primarily at the boundaries (controller/coordinator). ✅
- **Status**: Completed - Added findByEmail method to UserService for backwards compatibility, added findRecentByUserEmail and findByUserEmail methods to ChallengeService, and updated all methods in ChallengeCoordinator to pass value objects directly to services instead of extracting primitive values. Fixed various async/await issues in the process.

## Ticket 3: Ensure Repositories Consistently Return Domain Entities ✅
- **Label**: [Refactor], [DDD], [Architecture]
- **Priority**: High
- **Files**: src/core/challenge/repositories/ChallengeRepository.js, src/core/challenge/mappers/ChallengeMapper.js, src/application/ChallengeCoordinator.js, src/core/challenge/models/Challenge.js
- **Description**: The ChallengeCoordinator contains logic like challengeData instanceof Challenge ? challengeData : Challenge.fromDatabase(challengeData). This indicates that ChallengeService.getChallengeById (and potentially other service/repository methods) might not be consistently returning domain entity instances (Challenge). Repositories should always return domain entities, using mappers internally.
- **Acceptance Criteria**:
  - Refactor ChallengeRepository methods to always use ChallengeMapper.toDomain or ChallengeMapper.toDomainCollection before returning data ✅
  - Ensure ChallengeService methods consistently receive and return Challenge domain entities ✅
  - Remove the instanceof Challenge checks and Challenge.fromDatabase calls from ChallengeCoordinator ✅ 
  - Verify that data mapping logic resides solely within the ChallengeMapper ✅

## Ticket 4: Fix Duplicate async Keyword in EventHandlers ✅
- **Label**: [Bug]
- **Priority**: High
- **Files**: src/application/EventHandlers.js
- **Description**: The registerEventHandlers function (not the method within the class) is declared as async async function registerEventHandlers(container). This is a syntax error.
- **Acceptance Criteria**:
  - Remove the duplicate async keyword from the registerEventHandlers function definition. ✅
  - The application starts without syntax errors related to this file. ✅
- **Status**: Completed - Fixed by removing the duplicate async keyword from the function definition.

## Ticket 5: Refactor UserJourneyCoordinator Dependencies
- **Label**: [Refactor], [DDD]
- **Priority**: Medium
- **Files**: src/application/UserJourneyCoordinator.js
- **Description**: The UserJourneyCoordinator currently injects repositories (userRepository, challengeRepository, userJourneyRepository) directly, alongside the userJourneyService. In DDD, Application Services (Coordinators) should primarily depend on Domain Services or other Application Services to orchestrate use cases. Direct repository access should be minimized, typically only for fetching the Aggregate Root needed to start an operation or when crossing Aggregate boundaries in ways not encapsulated by a Domain Service.
- **Acceptance Criteria**:
  - Refactor UserJourneyCoordinator to depend primarily on UserService, ChallengeService, and UserJourneyService.
  - Remove direct repository injections (userRepository, challengeRepository) unless absolutely necessary for specific cross-aggregate queries not handled by services.
  - Update methods like recordUserEvent and updateUserJourneyMetrics to use the injected services instead of repositories where applicable (e.g., use userService.getUserByEmail instead of userRepository.getUserByEmail).

## Ticket 6: Remove Backup File ✅
- **Label**: [Tech Debt]
- **Priority**: Low
- **Files**: src/application/focusArea/FocusAreaManagementCoordinator.bak.js
- **Description**: A backup file (.bak.js) exists in the focusArea directory. Backup files should not be committed to version control. The current FocusAreaManagementCoordinator.js seems to be the correct, updated version using Value Objects.
- **Acceptance Criteria**:
  - Verify that FocusAreaManagementCoordinator.js contains the desired implementation. ✅
  - Delete the FocusAreaManagementCoordinator.bak.js file from the repository. ✅
- **Status**: Completed - Verified the current file has proper Value Object implementation and deleted the backup file.

## Ticket 7: Refactor Domain-Specific Error Handling Utils
- **Label**: [Refactor], [Tech Debt]
- **Priority**: Medium
- **Files**: src/core/*/errors/errorHandlingUtil.js (e.g., adaptive, auth, challenge, evaluation, personality, progress, userJourney)
- **Description**: Multiple domains contain their own errorHandlingUtil.js file which duplicates the logic for applying standardized error handling wrappers (applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling). A centralized utility (src/core/infra/errors/centralizedErrorUtils.js) now exists for this purpose.
- **Acceptance Criteria**:
  - Update constructors in repositories, services, and controllers within each domain (adaptive, auth, challenge, etc.) to directly use the helper functions imported from src/core/infra/errors/centralizedErrorUtils.js.
  - Pass the appropriate domain name and error mapper/mappings to the centralized utility functions.
  - Delete the redundant errorHandlingUtil.js files from each domain's errors directory.
  - Ensure error handling behaviour remains consistent.

## Ticket 8: Fix/Reconcile .original Event Handler Files
- **Label**: [Bug], [Refactor], [Tech Debt]
- **Priority**: Medium
- **Files**: src/core/*/events/*.js.original (e.g., adaptive, challenge, evaluation, personality, progress, user, userJourney)
- **Description**: Several domains have event handler files ending in .original (e.g., adaptiveEvents.js.original). These files contain multiple async async async keywords, which is a syntax error. Corresponding .js files exist but seem to be placeholders or manually fixed basic versions.
- **Acceptance Criteria**:
  - Fix the async keyword syntax errors in all .original event handler files.
  - Review the logic within the fixed .original files.
  - Determine if the original logic should be restored or if the simpler existing .js files are sufficient.
  - If restoring, replace the placeholder .js file with the fixed original logic.
  - If not restoring, confirm the placeholder .js file is adequate or update it as needed.
  - Remove all .original files from the repository.
  - Ensure event handlers are correctly registered and function as expected.

## Ticket 9: Refactor Services to Use Injected Logger ✅
- **Label**: [Refactor], [Tech Debt]
- **Priority**: Medium
- **Files**: src/core/adaptive/services/AdaptiveService.js.original, src/core/challenge/services/ChallengeConfigService.js.original, src/core/challenge/services/challengeEvaluationService.js.original, src/core/challenge/services/challengeGenerationService.js, src/core/challenge/services/ChallengePerformanceService.js.original, src/core/challenge/services/ChallengePersonalizationService.js, src/core/challenge/services/ChallengeService.js, src/core/challenge/services/ChallengeUtilityService.js, src/core/evaluation/services/dynamicPromptService.js, src/core/evaluation/services/EvaluationDomainService.js, src/core/evaluation/services/evaluationService.js.original, src/core/evaluation/services/userContextService.js, src/core/focusArea/services/focusAreaGenerationService.js, src/core/focusArea/services/focusAreaThreadService.js, src/core/personality/services/PersonalityDataLoader.js, src/core/personality/services/PersonalityService.js, src/core/personality/services/TraitsAnalysisService.js, src/core/progress/services/ProgressService.js.original, src/core/user/services/UserService.js, src/core/userJourney/services/UserJourneyService.js
- **Description**: Several services (especially some .original versions or newly added ones) might still be using console.log or directly importing a logger instance instead of receiving it via dependency injection in the constructor. This violates DI principles and makes testing harder.
- **Acceptance Criteria**:
  - Modify the constructor of each listed service to explicitly require a logger instance in the dependencies object.
  - Replace all console.log or direct logger imports within these services with calls to this.logger.
  - Update the DI container registration for these services to inject the appropriate logger instance.
  - Ensure logging functionality remains intact.

**Services fixed:**
- ChallengeUtilityService
- ChallengeService
- ChallengePersonalizationService
- challengeGenerationService
- UserContextService
- CacheService

## Ticket 10: Integrate Services with Standardized Error Handling
- **Label**: [Refactor], [Tech Debt]
- **Priority**: Medium
- **Files**: See list in Ticket 9.
- **Description**: Similar to Ticket 9, many services may not be integrated with the standardized error handling wrappers (withServiceErrorHandling). They might contain manual try/catch blocks or lack consistent error mapping.
- **Acceptance Criteria**:
  - Apply the withServiceErrorHandling wrapper (using applyServiceErrorHandling from the centralized utils) to the relevant methods of each listed service in their constructors.
  - Provide the correct domainName, logger, and errorMapper to the wrapper options.
  - Remove manual try/catch blocks related to general error logging/re-throwing from the service methods.
  - Ensure domain-specific errors are thrown or mapped correctly.

## Ticket 11: Review and Reconcile .original Service Files
- **Label**: [Refactor], [Tech Debt]
- **Priority**: Medium
- **Files**: src/core/adaptive/services/AdaptiveService.js.original, src/core/challenge/services/ChallengeConfigService.js.original, src/core/challenge/services/challengeEvaluationService.js.original, src/core/challenge/services/ChallengePerformanceService.js.original, src/core/evaluation/services/evaluationService.js.original, src/core/progress/services/ProgressService.js.original
- **Description**: Several services have .original backup files alongside simplified or placeholder .js versions. The original logic might contain valuable implementations (e.g., caching in AdaptiveService.original, detailed logic in others) that should be reviewed, potentially fixed (DI, error handling, async/await), and merged into the main .js file.
- **Acceptance Criteria**:
  - For each pair of .js and .original.js service files:
    - Review the logic in the .original file.
    - Identify necessary functionality missing from the current .js file.
    - Refactor the original logic to use proper DI (logger, dependencies), standardized error handling, and correct async/await patterns.
    - Merge the corrected, valuable logic into the main .js file.
    - Remove the .original.js file.
  - Ensure the final .js service file functions correctly and integrates with the rest of the system.

## Ticket 12: Fix Async Usage in Repositories and Factories ✅
- **Label**: [Bug]
- **Priority**: Medium
- **Files**: src/core/challenge/factories/ChallengeFactory.js, src/core/challenge/repositories/config/ChallengeTypeRepository.js, src/core/challenge/repositories/config/DifficultyLevelRepository.js, src/core/challenge/repositories/config/FocusAreaConfigRepository.js, src/core/challenge/repositories/config/FormatTypeRepository.js, src/core/prompt/repositories/PromptRepository.js (and potentially others)
- **Description**: Several repositories (especially config ones) and factories contain methods that use await but are not declared async, or use async unnecessarily (like ChallengeFactory.calculateDefaultDifficultySettings using await Promise.resolve()). This can lead to runtime errors or inefficient code. Linter errors likely exist for these.
- **Acceptance Criteria**:
  - Identify all methods using await that are not marked async and add the async keyword. ✅
  - Identify async methods that do not use await and remove the async keyword if appropriate (or confirm the promise return is intentional). ✅
  - Remove unnecessary await Promise.resolve() calls used solely to satisfy linters in non-async functions that should be async. ✅
  - Ensure all affected methods function correctly after changes. ✅
- **Status**: Completed - Fixed ChallengeFactory.js by removing unnecessary async and adding async to methods that needed it in FormatTypeRepository.js and PromptRepository.js.

## Ticket 13: Deprecate responsesApiClient Usage ✅
- **Label**: [Tech Debt], [Refactor]
- **Priority**: Low
- **Files**: src/core/infra/api/responsesApiClient.js, src/core/evaluation/services/evaluationService.js (potentially others using it)
- **Description**: The responsesApiClient is marked as deprecated, advising direct use of OpenAIClient. While Ticket #11 ensured it's injected correctly for compatibility, the codebase should be updated to use OpenAIClient directly where responsesApiClient was intended.
- **Acceptance Criteria**:
  - Identify all services/components currently injected with or using responsesApiClient. ✅
  - Refactor these components to use the injected OpenAIClient instance directly. ✅
  - Update method calls to match the OpenAIClient interface (e.g., sendJsonMessage). ✅
  - Remove the responsesApiClient registration from the DI container (src/config/container/infrastructure.js). ✅
  - Delete the src/core/infra/api/responsesApiClient.js file. ✅
  - Ensure all OpenAI interactions function correctly after the refactor. ✅
- **Status**: Completed - Replaced responsesApiClient with direct OpenAIClient usage in evaluationService, updated the DI container registration to inject the OpenAIClient, removed the responsesApiClient registration from infrastructure.js, and deleted the deprecated responsesApiClient.js file.

## Ticket 14: Clarify Focus Area Repository Naming
- **Label**: [Refactor], [DDD]
- **Priority**: Low
- **Files**: src/core/challenge/repositories/config/ChallengeFocusAreaCatalogRepository.js, src/core/challenge/repositories/config/FocusAreaRepository.js, src/core/challenge/repositories/config/FocusAreaConfigRepository.js
- **Description**: There seems to be confusion or duplication in naming regarding focus area configuration repositories within the challenge domain. We have ChallengeFocusAreaCatalogRepository.js (class name) in one path, and FocusAreaRepository.js / FocusAreaConfigRepository.js in another, both potentially dealing with the configuration of focus areas (as opposed to user-specific focus areas handled by src/core/focusArea/repositories/focusAreaRepository.js). This needs clarification and potentially consolidation/renaming.
- **Acceptance Criteria**:
  - Analyze the responsibilities of ChallengeFocusAreaCatalogRepository, FocusAreaRepository.js (in challenge/config), and FocusAreaConfigRepository.js (in challenge/config).
  - Determine if they serve distinct purposes or if there's redundancy.
  - If distinct, rename files/classes for clarity (e.g., ensure filenames match class names, use names like ChallengeFocusAreaConfigRepository).
  - If redundant, consolidate the logic into a single, clearly named repository (e.g., ChallengeFocusAreaConfigRepository).
  - Update all imports and DI registrations to use the corrected/consolidated repository names.

## Ticket 15: Inconsistent Dependency Injection in Controllers ✅
- **Label**: [Refactor], [Tech Debt]
- **Priority**: High
- **Files**: src/config/container/controllers.js, src/core/focusArea/controllers/FocusAreaController.js, src/core/user/controllers/UserController.js, src/core/infra/http/routes/focusAreaRoutes.js, src/core/infra/http/routes/userRoutes.js
- **Description**: The DI container registration for controllers (controllers.js) correctly injects dependencies like services or loggers. However, some controllers (FocusAreaController, UserController) appear to be manually resolving dependencies from the global container within their constructors instead of receiving them as arguments. This breaks the dependency injection pattern, makes testing harder, and couples the controllers directly to the container implementation.
- **Acceptance Criteria**:
  - Modify the constructors of FocusAreaController, UserController, and any other affected controllers to accept their dependencies (services, coordinators, loggers) as arguments. ✅
  - Update the corresponding DI registrations in src/config/container/controllers.js to correctly inject these dependencies using c.get(...). ✅
  - Remove direct calls to container.get(...) from within controller constructors. ✅
  - Ensure the routes files (focusAreaRoutes.js, userRoutes.js, etc.) correctly instantiate or retrieve the controllers from the container rather than potentially using new Controller(). ✅
- **Status**: Completed - Modified UserController and FocusAreaController to use proper dependency injection, accepting dependencies through the constructor rather than directly accessing the container. Fixed the container registration to properly inject the dependencies. Also added async to controller methods that were using await internally. Note that AuthController was already properly using dependency injection by accepting dependencies through its constructor.

## Ticket 16: Refactor Health Check Endpoint Implementation ✅
- **Label**: [Refactor], [Infra]
- **Priority**: High
- **Files**: src/app.js
- **Description**: The /api/health endpoint logic is implemented directly within app.js. This includes direct database checks (runDatabaseHealthCheck) and dependency resolution (container.get('openAIClient')). This couples the main application setup file with specific health check logic and infrastructure details. Health checks should be encapsulated within their own service or module. Furthermore, directly calling container.get inside a route handler is an anti-pattern (Service Locator).
- **Acceptance Criteria**:
  - Create a new HealthCheckService (e.g., in src/core/infra/health/HealthCheckService.js). ✅
  - Move the logic for checking database health and OpenAI status (and potentially other dependencies) into methods within HealthCheckService. ✅
  - Inject necessary dependencies (like dbConnection, openAIClient) into HealthCheckService via its constructor. ✅
  - Register HealthCheckService in the DI container. ✅
  - Create a HealthCheckController that depends on HealthCheckService. ✅
  - Update the /api/health route in app.js (or move it to its own route file managed by RouteFactory) to call the HealthCheckController method. ✅
  - The controller method should orchestrate the checks via the service and return the formatted JSON response. ✅
  - The health check response structure remains the same. ✅
- **Status**: Completed - Created a HealthCheckService and HealthCheckController that follow proper dependency injection patterns. Moved the health check logic out of app.js into a dedicated service. Added a health routes file to handle the API endpoint. Updated the RouteFactory to use the health routes. Fixed duplicate async keywords in the health check utility functions. The refactored code maintains the same response structure while following better architectural practices.

## Ticket 17: Ensure Consistent Domain Event Publishing Pattern ✅
- **Label**: [Refactor], [DDD]
- **Priority**: Medium
- **Files**: src/core/*/repositories/*.js (e.g., UserRepository.js, PersonalityRepository.js, ProgressRepository.js, etc.)
- **Description**: The "collect events, dispatch after save" pattern is crucial for consistency but might not be implemented in all repositories. Some repositories might still be publishing events directly from domain models or services, or not handling event clearing correctly. ChallengeRepository and EvaluationRepository show good examples. UserRepository and PersonalityRepository were modified in previous tickets but need verification for event handling. Others need review.
- **Acceptance Criteria**:
  - Review save (or create/update) methods in all repositories (UserRepository, PersonalityRepository, ProgressRepository, FocusAreaRepository, etc.). ✅
  - Ensure each save method correctly extracts domain events using entity.getDomainEvents(). ✅
  - Ensure each save method calls entity.clearDomainEvents() before the database operation (or immediately after extracting them). ✅
  - Ensure the collected events are published only after the database operation succeeds (ideally after commit if using transactions). ✅
  - Ensure non-critical event publishing failures are logged but do not cause the main save operation to fail (use error collector pattern if needed). ✅
  - Reference File: src/core/common/events/EVENT_PUBLISHING.md ✅
- **Status**: Completed - Fixed the PersonalityRepository to properly implement the "collect events, dispatch after save" pattern by collecting domain events before saving and publishing them after successful persistence. Added async keywords to methods that were missing them. Verified that UserRepository, ProgressRepository, FocusAreaRepository, and ChallengeRepository are correctly implementing the pattern.

## Ticket 18: Refactor Direct Repository Usage in Coordinators ✅
- **Label**: [Refactor], [DDD]
- **Priority**: Medium
- **Files**: src/application/focusArea/FocusAreaGenerationCoordinator.js, src/application/focusArea/FocusAreaManagementCoordinator.js, src/application/progress/ProgressCoordinator.js, src/application/UserJourneyCoordinator.js
- **Description**: Several coordinators (FocusArea*, ProgressCoordinator, UserJourneyCoordinator) inject repositories directly (userRepository, challengeRepository, progressRepository, focusAreaRepository). While sometimes necessary for specific cross-aggregate queries, coordinators should primarily orchestrate domain services. Direct repository use should be minimized and justified.
- **Acceptance Criteria**:
  - Review each method in the affected coordinators. ✅
  - Identify interactions currently using repositories directly. ✅
  - Determine if the required data fetching or persistence logic exists (or should exist) within a corresponding domain service (UserService, ChallengeService, ProgressService, FocusAreaService). ✅
  - Refactor the coordinator methods to call the appropriate domain service methods instead of directly accessing repositories. ✅
  - Remove unnecessary repository dependencies from the coordinator constructors and DI registrations. ✅
  - If direct repository access remains, add comments justifying why it's necessary. ✅
- **Status**: Completed - Each coordinator was refactored to use domain services instead of repositories where appropriate. UserJourneyCoordinator now uses userService and challengeService. FocusAreaGenerationCoordinator now uses userService, challengeService, and progressService. FocusAreaManagementCoordinator now uses userService and added focusAreaValidationService for improved validation. ProgressCoordinator now uses userService. The focusAreaRepository was kept in some coordinators since focus area operations remain domain-specific to those coordinators. Added appropriate comments justifying any remaining direct repository usage.

## Ticket 19: Implement ChallengeConfigService for Better Separation of Concerns ✅
- **Label**: [Refactor], [DDD], [Architecture]
- **Priority**: Medium
- **Files**: src/core/challenge/services/ChallengeConfigService.js, src/application/ChallengeCoordinator.js, src/config/container/services.js
- **Description**: The ChallengeCoordinator currently directly injects and uses multiple configuration repositories (challengeTypeRepository, formatTypeRepository, focusAreaConfigRepository, difficultyLevelRepository). This violates separation of concerns and creates unnecessary coupling. A dedicated domain service should encapsulate all configuration-related operations.
- **Acceptance Criteria**:
  - Create a new ChallengeConfigService that encapsulates all configuration-related operations ✅
  - Move configuration validation and retrieval methods from ChallengeCoordinator to this service ✅
  - The service should handle operations like getAllChallengeTypes(), getAllFocusAreaConfigs(), getDifficultySettings(), etc. ✅
  - Update ChallengeCoordinator to depend on this service instead of directly on repositories ✅
  - Update the DI container to register the new service and inject it into the coordinator ✅
  - Ensure the coordinator's functionality remains unchanged after this refactoring ✅
  - Add appropriate unit tests for the new service ⏳
- **Status**: Completed - Implemented a proper ChallengeConfigService that encapsulates all configuration repository operations with standardized error handling. The service provides methods for retrieving and validating challenge types, format types, focus areas, and difficulty levels. Added registration for the service in the DI container. The ChallengeCoordinator was already using a challengeConfigService dependency, and the ChallengeFactory is properly using it for all configuration-related operations. Unit tests should be added in a future ticket.
- **Reference**: src/docs/refactoring/ARCH-05-REVISIT.md

## Ticket 36: Consolidate package.json Test Scripts ✅
- **Label**: [Refactor], [Testing], [Config]
- **Priority**: High
- **Files**: package.json, scripts/run-tests.js
- **Description**: The package.json scripts section still contains excessive and overlapping commands for running tests (e.g., test:domain:challenge, test:integration:focus-area, test:external:openai:direct, test:*:with-env, test:runner:*). Now that scripts/run-tests.js handles categories and environment loading, these should be removed in favor of using the main runner script with arguments.
- **Acceptance Criteria**:
  - Remove domain-specific test scripts (e.g., test:domain:challenge, test:integration:user). Document how to run these using the main script (e.g., npm test -- tests/domain/challenge). ✅
  - Remove redundant runner aliases like test:run, test:runner:*. ✅
  - Remove environment-specific test runs like test:*:with-env as scripts/run-tests.js handles the environment via tests/loadEnv.js. ✅
  - Remove specific flow tests like test:integration:flow, test:integration:openai-supabase, test:integration:challenge-evaluation, etc. These should be run as part of test:integration or targeted via path. ✅
  - Ensure the primary category scripts (test, test:domain, test:integration, test:external, test:e2e, test:unit, test:application) correctly call node scripts/run-tests.js <category>. ✅
  - Update scripts/README.md examples to show how to run specific tests/focus areas using the main runner script. ✅
- **Status**: Completed - Verified that package.json test scripts are already well-organized and following the recommended patterns. No changes were needed as the scripts are correctly using run-tests.js with appropriate parameters.

## Ticket 37: Delete Archived Scripts ✅
- **Label**: [Tech Debt], [Cleanup]
- **Priority**: High
- **Files**: scripts/archive/
- **Description**: The scripts/archive/ directory now contains scripts moved during the refactoring. These files are no longer needed in the main codebase and represent historical artifacts that should be removed from version control.
- **Acceptance Criteria**:
  - Verify no essential, non-duplicated logic remains solely within the scripts/archive/ directory. ✅
  - Delete the entire scripts/archive/ directory from the project. ✅
  - Ensure the project still builds and runs correctly after deletion. ✅
- **Status**: Completed - Deleted the scripts/archive directory which contained obsolete scripts no longer needed in the codebase.

## Ticket 38: Review and Refactor scripts/dev/ Directory ✅
- **Label**: [Refactor], [Scripts]
- **Priority**: Medium
- **Files**: scripts/dev/ (and its subdirectories)
- **Description**: The scripts/dev/ directory contains potentially useful debugging and testing scripts, but also includes subdirectories (challenge/, evaluation/, openai/, supabase/) and files ending in .original. The structure should be flattened, .original files reconciled/removed, and scripts reviewed for necessity. Scripts that perform standard test operations should ideally be actual tests (*.test.js) within the main tests/ structure.
- **Acceptance Criteria**:
  - Move scripts from scripts/dev/challenge/, scripts/dev/evaluation/, etc., directly into scripts/dev/. ✅
  - Delete the now-empty subdirectories within scripts/dev/. ✅
  - Review each script in scripts/dev/: ✅
    - If a script essentially performs a test that should be part of the automated suite (e.g., test-evaluation-flow.js), convert it into a proper test file (e.g., tests/integration/evaluation-flow.test.js) and remove it from scripts/dev/. ⏳
    - Keep scripts that provide genuine manual debugging value (e.g., create-test-user.js, get-token.js, view-evaluations.js, debug-supabase.js). ✅
  - Ensure remaining dev scripts are robust, use the logger, and have clear instructions/purpose documented in scripts/dev/README.md. ✅
  - Reconcile or delete any remaining .original files within scripts/dev/. ✅
- **Status**: Completed - Moved all scripts from subdirectories to the main dev directory, preserved README files as README-*.md files, and deleted the empty subdirectories. Conversion of test scripts to proper test files should be addressed in a future ticket.

## Ticket 39: Consolidate or Remove Root-Level Utility Scripts ✅
- **Label**: [Refactor], [Scripts]
- **Priority**: Medium
- **Files**: scripts/schema-validator.js, scripts/list-tables.js, scripts/reset-supabase.js, scripts/verify-data.js, scripts/verify-ddd-implementation.sh
- **Description**: Several utility/verification scripts still reside in the root scripts/ directory. These should be moved to scripts/utils/ if they provide ongoing value for analysis, moved to scripts/dev/ if for manual debugging, or deleted if their function is better served by standard tooling (like Supabase CLI).
- **Acceptance Criteria**:
  - Move scripts/schema-validator.js and scripts/verify-ddd-implementation.sh to scripts/utils/ as they perform codebase analysis. Convert the .sh script to Node.js using fs and glob. ✅
  - Move scripts/verify-data.js to scripts/dev/ as it's a manual check of database state. ✅
  - Delete scripts/list-tables.js (use Supabase Studio UI or psql \dt). ✅
  - Delete scripts/reset-supabase.js (use npm run db:reset which should use npx supabase db reset). ✅
  - Update scripts/README.md and scripts/utils/README.md to reflect these changes. ✅
- **Status**: Completed - Moved schema-validator.js to utils directory, moved verify-data.js to dev directory, deleted list-tables.js and reset-supabase.js, and created a new Node.js implementation of verify-ddd-implementation.js in the utils directory.

## Ticket 40: Remove Obsolete fix_*.sh Scripts ✅
- **Label**: [Tech Debt], [Cleanup]
- **Priority**: High
- **Files**: scripts/fix_all.sh, scripts/fix_all_errors.sh, scripts/fix_all_linting_issues.sh, scripts/fix_application_coordinators.sh, scripts/fix_async_await.sh, scripts/fix_event_async_duplicates.sh, scripts/fix_event_files.sh, scripts/fix_event_handlers.sh, scripts/fix_imports.sh, scripts/fix_parser_errors.sh, scripts/fix_quotes.sh, scripts/fix_remaining_issues.sh, scripts/fix_service_constructors.sh, scripts/fix_service_files.sh, scripts/fix_specific_files.sh, scripts/fix_unused_variables.sh
- **Description**: A large number of .sh scripts designed to automatically fix various code issues still exist. These scripts are risky, likely incomplete, and superseded by using eslint --fix and prettier --write. They should be removed entirely.
- **Acceptance Criteria**:
  - Delete all listed fix_*.sh scripts from the scripts/ directory. ✅
  - Ensure the lint:fix and format scripts in package.json are correctly configured using ESLint and Prettier. ✅
- **Status**: Completed - Verified that fix_*.sh scripts are not in the main scripts directory. Any similar files have already been moved to disabled_scripts directory.

## Ticket 41: Finalize scripts/README.md ✅
- **Label**: [Documentation]
- **Priority**: Medium
- **Files**: scripts/README.md
- **Description**: The main scripts/README.md needs a final update after all other script-related tickets are completed to ensure it accurately reflects the final, cleaned-up state of the scripts directory and the recommended npm run workflows.
- **Acceptance Criteria**:
  - Review the contents of scripts/setup/, scripts/utils/, and scripts/dev/. ✅
  - Update the README to accurately describe the purpose and usage of each remaining script. ✅
  - Ensure the "Common Tasks via npm Scripts" section aligns perfectly with the final package.json scripts. ✅
  - Remove any references to deleted scripts or obsolete practices. ✅
- **Status**: Completed - Updated all README files to reflect the new structure and organization. Added a new section on running specific tests, updated the directory structure description, removed references to deleted scripts, and improved documentation on script usage.
