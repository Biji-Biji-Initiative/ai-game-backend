Backend Architecture & Developer Guide Update (v1.0.1)
1. Introduction
Purpose: This document serves as the primary reference guide for understanding, developing, and maintaining the backend application (ai-fight-club-api). It consolidates findings from previous architectural reviews, post-mortem analyses of startup failures and bugs, and establishes best practices moving forward. Its goal is to ensure developers adhere to the chosen architectural patterns, maintain code quality, and contribute to a resilient and scalable system.
Current Status (As of latest review): The backend API is now fully operational and stable after resolving several critical dependency injection, server startup, and path resolution issues. Core DDD principles have been effectively applied, and all major startup failures have been fixed. Key components including user journey tracking, challenge management, and focus area functionality are now correctly initialized and operational.
Target Audience: Backend Developers, DevOps Engineers, Technical Leads.
2. Core Architectural Principles
[Original content remains the same]
3. Key Components & Layers
[Original content remains the same]
4. Dependency Injection (DI) System
The application uses a custom Dependency Injection container (src/config/di/DIContainer.js) - NOT Awilix, despite some initial syntax confusion found in the codebase.
Key Principles:
Registration: Components are registered with the container primarily in src/config/container.js, which orchestrates registration functions from files like src/config/di/infrastructure.js, repositories.js, services.js, etc.
Factory Functions: Components should be registered using factory functions that accept the container instance (c) and use c.get('dependencyName') to resolve dependencies.
Apply
;
Resolution: Dependencies are resolved by the container when a component is requested (e.g., container.get('userService')).
Lifetimes: Components are typically registered as SINGLETON (one instance shared) or TRANSIENT (new instance each time).
CRITICAL: AVOID PREMATURE INSTANTIATION:
DO NOT use new SomeRepository() or new SomeService() at the top level (module scope) of any file, especially within domain models, event files, or utility files.
Why? This code executes when Node.js first loads the file, often before the DI container has initialized critical dependencies like the database client (supabase) or eventBus. This was the root cause of major startup crashes that were extremely hard to debug.
Correct Approach: Always let the DI container create instances via the registered factory functions, ensuring dependencies are ready. If a component needs a dependency, it should receive it via its constructor, and the DI factory function should resolve and pass those dependencies.
Dependency Order: The registration order in container.js matters. Register infrastructure components (config, logger, db client, event bus) before components that depend on them (repositories, services).
NEW: Complete Dependency Declarations: When registering services, coordinators, or controllers, ensure all dependencies expected by the constructor are provided. Missing even a single required dependency will cause the entire DI graph for that component to fail, resulting in startup errors or fallback routes.
NEW: Import/Export Patterns with ES Modules:
Dynamic Imports: When using dynamic imports in registration factories, use import() (not require()) for ES modules:
Apply
export
Default vs. Named Exports: Be precise about how exports are structured:
Apply
;
Defensive Programming in DI: When a component has optional dependencies, check for their existence before using them and provide sensible fallbacks.
5. Data Flow Example (HTTP Request)
[Original content remains the same]
6. Common Pitfalls & Lessons Learned (Historical Issues)
These issues caused significant problems (startup crashes, bugs, instability) during development and refactoring. Understanding them is key to preventing recurrence.
DI Violation: Premature Instantiation: (See Section 4) Creating new Repository() or new Service() at the module scope before DI setup was the biggest cause of startup crashes. Always use the DI container.
DI Violation: Library/Syntax Mismatch: Attempting to use Awilix registration syntax (asClass().inject()) with the custom DI container caused registration failures. Stick to the factory function pattern.
Circular Dependencies: Module import cycles (e.g., A -> B -> C -> A), especially involving the event system, caused unpredictable loading errors. Use tools like dependency-cruiser to detect cycles and refactor (e.g., extract shared constants/types) to break them.
ESM Import Errors: Incorrectly using default imports (import Thing from './thing.js') when the module only has named exports (export { Thing }) or vice-versa, caused SyntaxError during module loading. Be precise with imports.
Configuration Errors:
Port Mismatch: .env specified PORT 3000, but testing/PM2 expected 3080. Ensure .env and deployment configurations are consistent.
Missing Env Vars: Critical variables (e.g., SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) missing or incorrect caused infrastructure (DB client) initialization failures. Validate essential config at startup.
CORS Misconfiguration: Allowing * origin in production is a security risk. Ensure ALLOWED_ORIGINS is explicitly set.
Inconsistent Repository/Mapper Usage: (From DDD_Review_Findings.md)
Repositories sometimes manually converted data (_snakeToCamel) instead of passing raw DB data to mapper.toDomain().
Repositories sometimes manually constructed domain objects after mapping instead of letting mapper.toDomain() handle it.
Repositories sometimes used mapper.toPersistence() incorrectly when fetching data.
Rule: Repositories fetch raw data -> pass to mapper.toDomain(). Repositories get domain object -> pass to mapper.toPersistence() -> save raw data.
Missing async Keyword: Forgetting async on a function that uses await caused SyntaxError: Unexpected reserved word. Use linters to catch this.
Environment Issues:
Disk Space: Low disk space (ENOSPC) caused failures in logging and memory diagnostics, preventing startup. Monitor disk space in all environments.
Node Version: While not the root cause of major crashes, using non-LTS Node versions (like v22 initially) can introduce subtle incompatibilities. Stick to LTS (e.g., v20).
Process Management: Lingering processes occupying the required port or inconsistent PM2 state prevented clean restarts. Ensure proper process management (pm2 list, kill, using ecosystem.config.cjs).
Route Definition Issues:
Order: Defining parameterized routes before specific routes (e.g., /:id before /types) prevents the specific route from ever matching. Order matters.
Proxy/Endpoint Mismatch: Frontend requesting /api/logs while backend serves /api/system/logs, compounded by proxy misconfigurations, led to 404s. Ensure frontend and backend endpoint definitions align. Use configuration for endpoints.
NEW: BaseCoordinator and BaseSomething Patterns: Usage of base classes like BaseCoordinator can lead to subtle "this" binding issues if not careful. Special attention to how properties are initialized is important (e.g., the issue with this.logger = this.dependencies.logger causing undefined access).
NEW: Main Module Detection in ES Modules: The way Node.js distinguishes between a file being run directly (node src/index.js) versus being imported causes server startup issues:
Issue: import.meta.url contains URL encoding (%20 for spaces) while process.argv[1] uses raw file paths. Direct string comparison fails.
Solution: Use the fileURLToPath utility from the url module to normalize paths:
Apply
}
NEW: Double Route Definition Anti-Pattern:
Issue: Routes are defined in both domain-specific route modules and inside the RouteFactory._createRouters method, causing confusion and potential inconsistencies.
Preferred Pattern: Domain routes (userRoutes.js, etc.) should define all routes. The RouteFactory should simply get these pre-defined routers from the DI container and mount them.
Current Status: This remains an architectural issue to be addressed.
7. Best Practices & Maintaining Health
7.1. Development Workflow
[Original content remains the same]
7.2. Architecture & Coding
Strict DI Adherence: Never instantiate components directly at module scope. Use the DI container and factory functions. Inject dependencies via constructors.
Repository/Mapper Pattern: Strictly follow the pattern described in Section 5. Mappers handle all data transformation. Repositories use mappers. Domain models remain pure.
Error Handling:
Use custom error classes (src/core/infra/errors, src/core/{domain}/errors).
Standardize error response formats using errorHandler.js and responseFormatterMiddleware.js.
Handle potential errors gracefully (e.g., database connection errors, external API failures).
Async/Await: Be meticulous about using async on functions that contain await. Use try...catch or .catch() for promise error handling.
Immutability: Favor immutable data structures where practical, especially for Value Objects.
NEW: Dependency Validation: In component constructors, use explicit validation for required dependencies (e.g., if (!repository) throw new Error('repository is required')). This avoids silent failures or confusing errors when dependencies are missing.
NEW: DI Factory Patterns: For dynamic imports or complex initialization in DI factory functions, wrap in try/catch blocks to provide clear error messages. Use async factory functions when needed for dynamic imports.
7.3. Adding New Features/Domains
Define: Model the new domain entities, value objects.
Implement: Create Mapper, Repository (using DI for DB/logger/mapper), Application Service(s), Controller(s), and Routes ({domain}Routes.js).
Register:
Register Mapper, Repository, Service, Controller in the appropriate DI registration files (mappers.js, repositories.js, etc.).
Ensure correct dependencies are injected via factory functions.
Update container.js to call the new registration functions if needed.
Mount Routes: Add the new domain routes to RouteFactory.js. IMPORTANT: This currently requires adding routes both in the domain route module AND in RouteFactory._createRouters - an architectural issue to be addressed.
Test: Add unit and integration tests.
Document: Update OpenAPI spec and this guide if necessary.
7.4. Testing
[Original content remains the same]
7.5. Monitoring & Operations
[Original content remains the same]
8. Server Startup & Management
Development:
Ensure .env (or .env.development) has correct variables (DB keys, OpenAI key, PORT=3080, etc.).
Run: cd backend && npm install (if needed).
Start directly for detailed logs: npx env-cmd -f .env node src/index.js
Or use PM2 (if configured): pm2 start ecosystem.config.cjs --env development (or similar) / pm2 restart ecosystem.config.cjs --update-env.
Startup Process Explained:
src/index.js imports the app from app.js.
When run directly (vs. imported by another module), it calls app.listen() to start the HTTP server.
This determination uses a path normalization helper to handle URL encoding differences.
Startup errors will be logged and cause the process to exit with code 1.
Production:
Use environment variables directly or a secure configuration management system (Do not rely on .env files committed to repo).
Ensure NODE_ENV=production.
Use PM2 with ecosystem.config.cjs: pm2 start ecosystem.config.cjs --env production.
PM2 Commands:
pm2 list: Show running processes.
pm2 logs <app-name>: Tail logs.
pm2 restart <app-name>: Restart specific app.
pm2 stop <app-name>: Stop app.
pm2 delete <app-name>: Stop and remove app from PM2 list.
pm2 monit: Monitor resource usage.
9. Pending Architectural Issues
1. RouteFactory Pattern Conflict:
Current Issue: Routes are defined in two places: domain-specific route modules (userRoutes.js, etc.) and inside the RouteFactory._createRouters method.
Impact: This creates redundancy, violates Separation of Concerns, and makes the codebase harder to maintain. Changes to routes might need to be made in multiple places.
Recommended Fix: Refactor RouteFactory to:
Remove the internal route definitions from _createRouters
Get pre-registered router instances from the DI container (e.g., container.get('userRoutes'))
Apply common middleware if needed
Mount these routers at the correct paths
Difficulty Level: Medium (requires careful refactoring to ensure all routes remain functional)
2. Missing Accessor Pattern for Mappers:
Current Issue: Some repositories access mappers directly rather than through the DI container.
Impact: This creates tight coupling and makes testing harder.
Recommended Fix: Ensure all mappers are accessed through the DI container consistently.
3. Inconsistent Error Handling:
Current Issue: Error handling patterns vary across different parts of the application.
Impact: Unpredictable error responses and harder debugging.
Recommended Fix: Standardize on the error handling pattern in src/core/infra/errors/errorStandardization.js.
10. Conclusion
The backend application is built on solid architectural principles (DDD, Hexagonal, DI). However, strict adherence to these patterns, particularly regarding Dependency Injection and the Data Mapper pattern, is crucial for stability and maintainability. Past issues stemmed largely from deviations from these principles and configuration errors.
Recent fixes to dependency injection, module importing patterns, and server startup logic have resolved the critical operational issues, allowing the server to run reliably. However, there remain architectural inconsistencies (particularly around route definition) that should be addressed for long-term maintainability.
By following the best practices outlined in this guide, developers can contribute to a robust, testable, and scalable backend, avoiding the pitfalls encountered previously. This document should be kept up-to-date as the architecture evolves.