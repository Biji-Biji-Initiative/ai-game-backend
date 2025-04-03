# Backend Architecture & Developer Guide (v2.0)

## 1. Introduction

**Purpose:** This document serves as the **current and definitive reference guide** for understanding, developing, and maintaining the backend application (`ai-fight-club-api`). It reflects the stable architecture achieved after significant refactoring and troubleshooting, superseding all previous versions and guides. Its goal is to ensure developers adhere to the established architectural patterns, maintain code quality, and contribute to a resilient and scalable system, preventing the recurrence of past issues.

**Current Status (v2.0):** The backend API is **fully operational, stable, and production-ready**. Critical dependency injection issues, server startup failures, path resolution errors, and health check inaccuracies have been resolved. The architecture now employs a **direct route mounting strategy**, bypassing previous complexities with DI-based route registration. Core DDD principles remain applied, and key components (DI container, event system, core services, controllers) are correctly initialized and operational. Health checks provide accurate status for critical dependencies (Database, OpenAI). Authentication is correctly enforced with appropriate exceptions for public routes.

**Target Audience:** Backend Developers, DevOps Engineers, Technical Leads.

## 2. Core Architectural Principles

*   **Domain-Driven Design (DDD):** Bounded Contexts, Entities, Value Objects, Aggregates, Repositories, Domain Services.
*   **Hexagonal Architecture (Ports & Adapters):** Core domain logic isolated from external concerns (UI, DB, APIs). Ports define interfaces; Adapters implement them.
*   **Clean Architecture:** Dependency rule (inner layers don't know about outer layers).
*   **Dependency Injection (DI):** Centralized management of object creation and dependencies.
*   **Separation of Concerns (SoC):** Modules have distinct responsibilities.
*   **Asynchronous Processing:** Leveraging `async/await` for non-blocking I/O.
*   **Event-Driven Architecture:** Components communicate via an event bus for decoupling.

## 3. Key Components & Layers

*   **Core Domain (`src/core/{domain}`):** Contains domain entities, value objects, aggregates, domain services, and repository interfaces (ports). Pure business logic, no infrastructure concerns.
*   **Application (`src/application`):** Orchestrates use cases, coordinates across domains, may contain application-specific services. Uses domain services and repositories.
*   **Infrastructure (`src/core/infra`, `src/config`):** Implements ports defined in the core. Adapters for database access (repositories), external APIs (OpenAI client), logging, event bus, caching, DI container setup, server setup (`app.js`, `index.js`).
*   **Presentation (`src/core/infra/http`):** API controllers handling HTTP requests/responses, route definitions, middleware. Uses application or domain services.

## 4. Dependency Injection (DI) System

The application uses a **custom Dependency Injection container** (`src/core/infra/di/DIContainer.js`).

**Key Principles & Practices:**

*   **Registration:** Components are registered with the container primarily in `src/config/container/index.js`, which orchestrates registration functions from files like `infrastructure.js`, `repositories.js`, `services.js`, `ai.js`, `constants.js`, `coordinators.js`, and `controllers.js`. **Route registration via DI is DEPRECATED (See Section 6).**
*   **Factory Functions:** The **required pattern** for registration. Components are registered using factory functions that accept the container instance (`c`) and use `c.get('dependencyName')` to resolve dependencies.
    ```javascript
    // Example in services.js
    container.register('userService', c => new UserService({
        userRepository: c.get('userRepository'),
        logger: c.get('userLogger'),
        eventBus: c.get('eventBus')
        // ... other dependencies
    }), true); // true for singleton
    ```
*   **Resolution:** Dependencies are resolved by the container only when a component is requested (e.g., `container.get('userService')`).
*   **Lifetimes:** Components are registered as `SINGLETON` (one instance shared, use `true`) or `TRANSIENT` (new instance each time, use `false` or omit). Choose based on statefulness and performance needs. Most infrastructure and configuration components are singletons. Services might be transient or singleton.
*   **CRITICAL: AVOID PREMATURE INSTANTIATION:**
    *   **NEVER** use `new SomeRepository()` or `new SomeService()` at the top level (module scope) of *any* file.
    *   **Why?** This executes when the file is first loaded by Node.js, often *before* the DI container has initialized critical dependencies (like the database client or event bus). This was a primary cause of severe, hard-to-debug startup crashes.
    *   **Correct Approach:** Always let the DI container create instances via the registered factory functions. Dependencies are injected via constructors, resolved by the factory using `c.get()`.
*   **Dependency Order:** The registration order in `container/index.js` matters. Register foundational components (`config`, `logger`, `db`, `eventBus`) *before* components that depend on them (repositories, services, etc.).
*   **Complete Dependency Declarations:** Ensure **all** dependencies expected by a component's constructor are provided in its registration factory. Missing dependencies will cause runtime errors when the component is resolved. Use defensive checks in constructors for critical dependencies.
*   **Asynchronous Dependencies:** Dependencies requiring `await` (like `robustEventBus` needing `deadLetterQueueService`) are handled correctly by making their registration factory functions `async` and using `await c.getAsync()` if the container supports it, or ensuring registration order handles the async flow. The event bus chain (`deadLetterQueueService` -> `robustEventBus` -> `eventBus`) is now correctly configured asynchronously.
*   **ES Module Imports/Exports:**
    *   Use standard `import` statements. Dynamic `import()` can be used inside `async` factory functions if needed.
    *   Be precise with default (`import Thing from './thing.js'`) vs. named (`import { Thing } from './thing.js'`) imports based on how the module exports its members.
*   **Circular Dependencies:** While best avoided, unavoidable cycles (like `ChallengeFactory` <> `ChallengeConfigService`) are handled using **Proxy Objects**. A proxy (`challengeConfigServiceProxy` in `services.js`) is registered, providing only the necessary methods from the dependency, thus breaking the direct import cycle during initialization.
*   **Defensive Programming in DI:** For optional dependencies, check for their existence within the component's logic before use. For critical dependencies, validate their presence in the constructor.

## 5. Data Flow Example (HTTP Request)

1.  HTTP Request arrives.
2.  Core Middleware (logging, security, CORS, rate limiting, request ID) executes (`config/setup/middleware.js`).
3.  **Authentication Middleware** executes (`config/setup/middleware.js`), checks if path is public; if not, validates token via `createAuthMiddleware` (`core/infra/http/middleware/auth.js`).
4.  **Direct Route Mounter** (`config/setup/directRoutes.js`) directs request to the appropriate router (e.g., User routes).
5.  User Router (`core/infra/http/routes/userRoutes.js`) maps request to a Controller method (e.g., `userController.getUser`).
6.  Controller (`core/user/controllers/UserController.js`) parses request, calls Application/Domain Service (e.g., `userService.findUserById`). Dependencies are injected by DI.
7.  Service (`core/user/services/UserService.js`) executes business logic, calls Repository (e.g., `userRepository.findById`). Dependencies injected by DI.
8.  Repository (`core/infra/db/repositories/UserRepository.js`) interacts with database client (`db`), fetches raw data. Dependencies (db, logger, mapper) injected by DI.
9.  Repository uses Mapper (`core/infra/db/mappers/UserMapper.js`) via `mapper.toDomain()` to convert raw data to a domain entity.
10. Data flows back up: Repo -> Service -> Controller.
11. Controller formats response using `responseFormatterMiddleware`.
12. Response sent to client.

## 6. Route Registration (The Current Standard)

Route registration via the DI container (`container/routes.js`) and the `RouteFactory.js` class is **DEPRECATED** and no longer used for primary route mounting.

**Current Approach: Direct Route Mounting**

*   **Mechanism:** Routes are now mounted directly onto the Express `app` instance during the server setup phase.
*   **Implementation:** The core logic resides in `config/setup/directRoutes.js` within the `mountAllRoutes` function.
*   **How it Works:**
    1.  The `mountAllRoutes` function receives the `app`, the fully configured `container`, and the `config`.
    2.  It retrieves necessary controllers or services directly from the container (e.g., `container.get('userController')`, `container.get('healthCheckController')`).
    3.  It calls the respective route factory functions (e.g., `userRoutes(userController, authController)`, `healthRoutes({ container, healthCheckController })`) which return configured Express Routers.
    4.  These individual routers are then explicitly mounted onto a master `apiRouter` using `apiRouter.use('/users', userRouter)`, etc.
    5.  The master `apiRouter` is finally mounted onto the main `app` at the configured API prefix (`app.use(config.api.prefix, apiRouter)`).
    6.  Error handling (try/catch blocks) around each route mounting provides clearer feedback and allows for fallback routes if a specific module fails.
*   **Invocation:** The main server setup (`config/setup/routes.js` in `mountAppRoutes`) now directly calls `await mountAllRoutes(app, container, config)`. The `RouteFactory` fallback logic has been removed.
*   **Benefits:**
    *   **Simplicity:** Easier to understand and debug route setup.
    *   **Explicit Control:** Clear control over the order and mounting path of routes.
    *   **Avoids DI Complexity:** Bypasses issues related to registering route components within the DI lifecycle, especially concerning logger availability and dependency readiness.
    *   **Resolves Past Issues:** Eliminates the "Double Route Definition" anti-pattern and the errors associated with `RouteFactory`.

## 7. Authentication & Authorization

*   **Middleware:** Authentication is handled by `createAuthMiddleware` (`core/infra/http/middleware/auth.js`), which uses the Supabase client (`db`) obtained from the DI container.
*   **Global Application:** The authentication middleware is applied globally within `config/setup/middleware.js`.
*   **Public Path Exclusion:** A specific mechanism within `config/setup/middleware.js` explicitly checks the request path and **skips** authentication for defined public paths:
    ```javascript
    const publicPaths = [
        `${config.api.prefix}/health`,
        `${config.api.prefix}/auth`
    ];
    // Logic checks if req.path.startsWith any publicPath
    ```
    All other routes under `config.api.prefix` will have the authentication middleware applied.
*   **Authorization:** Role-based access control (e.g., `requireAdmin`) is handled by separate middleware applied within specific routes or routers (e.g., inside `systemRoutes.js`). The `AuthorizationService` can be used for more complex permission checks.

## 8. Health Checks

*   **Service:** Implemented in `HealthCheckService` (`core/infra/health/HealthCheckService.js`).
*   **Endpoint:** Exposed at `/api/health` (which is configured as a public path).
*   **Dependencies:** The service requires specific dependencies injected during DI registration (`config/container/services.js`):
    *   `runDatabaseHealthCheck`: An `async` function that performs a live check against the database (currently uses `dbClient.rpc('echo', ...)`).
    *   `openAIClient`: The registered AI client adapter instance (`aiClient`).
    *   `checkOpenAIStatus`: An `async` function that uses the `aiClient`'s underlying SDK client (`aiClient.openAIClient`) to perform a live, low-cost check against the OpenAI API (currently uses `openAIClient.models.list({ limit: 1 })`).
    *   `logger`: A logger instance.
*   **Implementation:** The registration factory in `services.js` now correctly constructs these functions/provides these dependencies when creating the `HealthCheckService` instance, resolving previous "function not available" or "client unavailable" errors.

## 9. Event System

*   The event system (`EventBus`, `RobustEventBus`, `DeadLetterQueueService`) setup is now stable.
*   Asynchronous registration dependencies (`eventBus` depends on `robustEventBus`, which depends on `deadLetterQueueService`) are correctly handled in `infrastructure.js` using `async` factory functions and `await c.get()`.
*   Event handlers are registered in `config/setup/events.js`, correctly awaiting the `eventBus` from the container.

## 10. Common Pitfalls & Lessons Learned (v2.0 Perspective)

Understanding these historical issues is crucial to avoid repeating them:

*   **DI Violation: Premature Instantiation:** (See Section 4) **Still the #1 rule.** Never `new Component()` at module scope. Let DI handle it.
*   **DI Violation: Missing/Incorrect Dependencies:** Ensure registration factories provide *all* required constructor arguments. Use constructor validation.
*   **Circular Dependencies:** Use proxies or refactor to break import cycles. `dependency-cruiser` is helpful for detection.
*   **ESM Import Errors:** Match default/named imports precisely with module exports.
*   **Configuration Errors:** Validate critical env vars (`SUPABASE_URL`, `OPENAI_API_KEY`, `PORT`) at startup. Ensure consistency between `.env`, `ecosystem.config.cjs`, and deployment environments. Use explicit `ALLOWED_ORIGINS` for CORS in production.
*   **Inconsistent Repository/Mapper Usage:** Strictly adhere to the pattern: Repos fetch raw -> `mapper.toDomain()`. Service gives domain -> Repo uses `mapper.toPersistence()` -> Repo saves raw.
*   **Missing `async` Keyword:** Use linters.
*   **Environment Issues:** Monitor disk space. Use LTS Node versions (v20 recommended). Manage processes cleanly (`kill`, `pm2`).
*   **Route Definition Issues (Historical):** Parameterized vs specific route order still matters within *individual* router files (`userRoutes.js`, etc.). The conflict between `RouteFactory` and domain routes is **resolved** by using `directRoutes.js`.
*   **BaseClass `this` Binding:** Be cautious with `this` in base classes; ensure properties are initialized correctly.
*   **Main Module Detection:** Use `fileURLToPath` from `url` module for reliable main module checks in `index.js`.

## 11. Best Practices & Maintaining Health (v2.0)

*   **Strict DI Adherence:** (See Section 4).
*   **Repository/Mapper Pattern:** Follow strictly.
*   **Error Handling:** Use custom errors, standardize responses (`errorHandler.js`, `responseFormatterMiddleware.js`).
*   **Async/Await:** Use correctly, handle errors with `try/catch` or `.catch()`.
*   **Immutability:** Use where practical (Value Objects).
*   **Dependency Validation:** Use constructor checks for required dependencies.
*   **DI Factory Patterns:** Use `async` factories for `await`, wrap complex logic in `try/catch`.
*   **Adding New Features/Domains:**
    1.  Define Domain Models.
    2.  Implement Mapper, Repository, Service(s), Controller(s), and the domain-specific Router file (`{domain}Routes.js`).
    3.  Register Mapper, Repository, Service, Controller in the appropriate DI files (`mappers.js`, `repositories.js`, etc.), ensuring correct dependencies via factory functions.
    4.  **Mount Route:** Modify `config/setup/directRoutes.js`:
        *   Import the new domain route factory function (e.g., `import myDomainRoutes from "...";`).
        *   Inside the main `try` block of `mountAllRoutes`, add a new `try/catch` block:
            *   Get the required controller(s) from the container (`container.get('myDomainController')`).
            *   Create the router instance (`const myRouter = myDomainRoutes(myController);`).
            *   Mount it on the `apiRouter` (`apiRouter.use('/my-domain', myRouter);`).
            *   Add logging.
            *   Include a fallback route in the `catch` block.
    5.  Add Tests (Unit, Integration).
    6.  Document (OpenAPI spec, this guide if needed).

## 12. Server Startup & Management

*   **Development:** Use `npx env-cmd -f .env node src/index.js` (PORT=3080 in `.env` recommended). Ensure `.env` has correct keys.
*   **Production:** Use environment variables (not `.env` files in repo). `NODE_ENV=production`. Use PM2 with `ecosystem.config.cjs`.
*   **PM2 Commands:** `list`, `logs`, `restart`, `stop`, `delete`, `monit`.
*   **Startup Process:** `src/index.js` -> `app.js` -> Core Setup (DI, Middleware, Events, **Direct Route Mounting**) -> `app.listen()`.

## 13. Pending Architectural Issues (v2.0)

*   **Missing Accessor Pattern for Mappers:** Review needed to ensure all repositories access mappers via DI.
*   **Inconsistent Error Handling:** Review needed to ensure standardization across all modules using `errorStandardization.js`.
*   **(Minor) OpenAI Health Check Specificity:** The current check verifies connectivity but not necessarily model usability or quota status. Could be enhanced if needed.

## 14. Conclusion (v2.0)

The backend application is now stable, reliable, and built on sound architectural principles (DDD, Hexagonal, DI). Critical startup and runtime issues related to dependency injection, asynchronous operations, and route mounting have been **resolved**. The adoption of a **direct route mounting strategy** (`directRoutes.js`) has significantly simplified route management and eliminated previous architectural conflicts.

Strict adherence to the patterns outlined in this guide, particularly regarding Dependency Injection (using factory functions, avoiding premature instantiation) and the updated Route Registration process, is essential for maintaining the current stability and health of the codebase. While minor areas for standardization remain (Mapper access, Error Handling), the core architecture is robust and ready for further development. This guide provides the definitive blueprint for working with the backend.