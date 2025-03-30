# Monorepo Implementation Plan for AI Fight Club API

## 1. Current Project Assessment

The current project structure consists of:

- **Main API Service**: A Node.js Express application (with ESM modules)
- **API Tester UI**: A separate UI for testing API endpoints
- **Database Layer**: Supabase integration for data storage and authentication
- **Scripts & Tools**: Various utility scripts for development, testing, and deployment
- **Documentation**: Multiple markdown files with implementation details

## 2. Is a Monorepo a Good Idea?

### Advantages of Moving to a Monorepo:

1. **Centralized Code Management**: All related packages in one repository
2. **Simplified Dependency Management**: Share common dependencies across packages
3. **Atomic Changes**: Make related changes across multiple packages in a single commit
4. **Consistent Tooling**: Share configuration for linting, testing, and building
5. **Easier Collaboration**: Developers can see and understand the entire system
6. **Coordinated Versioning**: Ensure compatibility between related packages
7. **Unified CI/CD**: Streamline testing and deployment across packages

### Disadvantages:

1. **Repository Size**: May grow large over time, affecting clone times
2. **Learning Curve**: New monorepo tooling requires team education
3. **Build Complexity**: May require more sophisticated build tooling
4. **Performance Challenges**: CI/CD pipelines may need optimization for large monorepos

### Conclusion:

A monorepo structure would be beneficial for this project because:

- The project already has distinct components (API, UI tester, database)
- There are shared dependencies and utilities
- The components interact closely with each other
- The project benefits from coordinated versioning and releases

## 3. Monorepo Structure

The proposed monorepo structure:

```
ai-fight-club-monorepo/
├── package.json                 # Root package.json for workspace configuration
├── package-lock.json            # Lock file for the entire monorepo
├── .github/                     # GitHub workflows and configuration
├── .husky/                      # Husky git hooks
├── packages/
│   ├── api/                     # Core API service
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── application/
│   │   │   ├── controllers/
│   │   │   ├── core/
│   │   │   └── ...
│   │   ├── tests/
│   │   └── ...
│   ├── ui-tester/               # API testing UI
│   │   ├── package.json
│   │   ├── public/
│   │   ├── src/
│   │   └── ...
│   ├── database/                # Database layer & Supabase integration
│   │   ├── package.json
│   │   ├── migrations/
│   │   ├── schema/
│   │   └── ...
│   └── shared/                  # Shared utilities and types
│       ├── package.json
│       ├── src/
│       └── ...
├── tools/                       # Monorepo-level tools 
├── scripts/                     # Monorepo-level scripts
└── docs/                        # Project documentation
```

## 4. Implementation Steps

### Phase 1: Setup Monorepo Infrastructure (1 day)

1. **Create Monorepo Root**
   - Initialize workspace configuration with npm workspaces
   - Create root package.json with `"workspaces": ["packages/*"]`
   - Move shared dev dependencies (eslint, prettier, etc.) to root
   - Configure Husky at root level
   - Set up .npmrc file with proper workspace configuration

2. **Create Package Directory Structure**
   - Create packages directory with subdirectories for api, ui-tester, database, shared
   - Initialize individual package.json files with correct dependencies
   - Configure internal package dependencies with workspace protocol (e.g., "workspace:^")
   - Update .gitignore to handle monorepo-specific patterns

### Phase 2: Migrate API Service (1-2 days)

1. **Move Core API Code**
   - Move src/ to packages/api/src/
   - Update imports to reflect new structure
   - Update package.json to include API-specific dependencies
   - Configure TypeScript paths if needed for internal references
   - Move API-specific tests to packages/api/tests/

2. **Update Configuration**
   - Move API-specific env variables to packages/api/.env
   - Update CI configuration for API package
   - Update scripts for running API in isolation
   - Configure PM2 to work with the new structure

3. **Refactor Entry Points**
   - Update server.js and index.js for the new paths
   - Refactor app initialization to use shared components
   - Ensure proper error handling across boundaries

### Phase 3: Migrate UI Tester (1 day)

1. **Move UI Tester Code**
   - Move api-tester-ui/ contents to packages/ui-tester/
   - Update proxy configuration in server.js to point to new API location
   - Adjust package.json to reference correct workspace dependencies
   - Update static file references to match new paths

2. **Configure UI Dependencies**
   - Move UI-specific dependencies to ui-tester package.json
   - Set up proper development scripts
   - Configure static asset management

### Phase 4: Create Database Package (1 day)

1. **Extract Database Layer**
   - Move supabase/ directory to packages/database/
   - Extract Supabase-specific code from API to database package
   - Create clean repository interfaces for database operations
   - Export database client and utility functions
   - Update connection handling for production mode

2. **Configure Schema and Migrations**
   - Move schema definitions to database package
   - Configure migration scripts at database package level
   - Create utility functions for schema validation
   - Set up versioning for database schema

### Phase 5: Build Shared Package (1 day)

1. **Extract Shared Utilities**
   - Identify common utilities like logging, validation, and error handling
   - Move to packages/shared/src/utils/
   - Create index.js exports for easy importing
   - Set up proper module resolution

2. **Create Type Definitions**
   - Move or create TypeScript type definitions for shared entities
   - Set up proper module exports
   - Configure path aliases for easier imports
   - Create domain models that can be shared across packages

### Phase 6: Configure Build Pipeline (1 day)

1. **Setup Root Scripts**
   - Configure scripts in root package.json to run operations across workspaces
   - Set up concurrent processes for dev mode
   - Configure build order for dependencies
   - Create utility scripts for common operations

2. **Update CI/CD**
   - Update GitHub Actions to understand monorepo structure
   - Configure caching for faster builds
   - Set up conditional builds based on changed files
   - Configure deployment scripts for each package

## 5. Technical Implementation Details

### Root Package.json

```json
{
  "name": "ai-fight-club-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:api": "npm run dev -w packages/api",
    "dev:ui": "npm run dev -w packages/ui-tester",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint \"packages/*/src/**/*.{js,ts}\"",
    "format": "prettier --write \"packages/*/src/**/*.{js,ts,json,md}\"",
    "prepare": "husky"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "eslint": "^9.0.0",
    "husky": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

### API Package.json

```json
{
  "name": "@ai-fight-club/api",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "jest",
    "prod": "NODE_ENV=production node src/index.js",
    "pm2:start": "./scripts/start.sh",
    "pm2:stop": "./scripts/stop.sh",
    "pm2:restart": "./scripts/restart.sh"
  },
  "dependencies": {
    "@ai-fight-club/database": "workspace:^",
    "@ai-fight-club/shared": "workspace:^",
    "express": "^4.21.2",
    "body-parser": "^2.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "openai": "^4.90.0",
    "winston": "^3.17.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "supertest": "^7.1.0"
  }
}
```

### Database Package.json

```json
{
  "name": "@ai-fight-club/database",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "migrate": "node src/scripts/run-migrations.js",
    "seed": "node src/scripts/seed-data.js",
    "test": "jest"
  },
  "dependencies": {
    "@ai-fight-club/shared": "workspace:^",
    "@supabase/supabase-js": "^2.49.3",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "typescript": "^5.3.3"
  }
}
```

### Shared Package.json

```json
{
  "name": "@ai-fight-club/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "winston": "^3.17.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "typescript": "^5.3.3"
  }
}
```

### UI Tester Package.json

```json
{
  "name": "@ai-fight-club/ui-tester",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## 6. Inter-Package Communication

### Database to API Communication

The API will import database repositories from the database package:

```javascript
// In packages/api/src/app.js
import { createUserRepository, createChallengeRepository } from '@ai-fight-club/database';

// Initialize repositories
const userRepo = createUserRepository();
const challengeRepo = createChallengeRepository();
```

### Shared Types and Utilities

```javascript
// In packages/shared/src/index.js
export { logger } from './utils/logger.js';
export { ValidationError, DatabaseError } from './errors/index.js';
export * from './types/index.js';

// Usage in API package
import { logger, ValidationError } from '@ai-fight-club/shared';
```

### API to UI-Tester Communication

```javascript
// In packages/ui-tester/server.js
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy API requests to the API package
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));
```

## 7. Advanced Monorepo Features

### Typescript Path Aliases

Configure path aliases in tsconfig.json for easier imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@api/*": ["packages/api/src/*"],
      "@db/*": ["packages/database/src/*"],
      "@shared/*": ["packages/shared/src/*"],
      "@ui/*": ["packages/ui-tester/src/*"]
    }
  }
}
```

### Selective Testing and Building

Configure scripts for selective package operations:

```json
{
  "scripts": {
    "test:changed": "node scripts/test-changed-packages.js",
    "build:changed": "node scripts/build-changed-packages.js"
  }
}
```

### ESM and CommonJS Interoperability

Handle both ESM and CommonJS modules:

```javascript
// In shared/src/helpers/module-helper.js
export function createRequire(path) {
  if (typeof require !== 'undefined') return require;
  return import('module').then(module => module.createRequire(path));
}
```

### Dependency Hoisting

Configure npm to properly hoist dependencies to the root:

```
// .npmrc
hoist=true
shamefully-hoist=true
```

## 8. Deployment Strategy

### Production Deployment Configuration

1. **API Deployment**:
   - Build API package with dependencies
   - Deploy as standalone Node.js application with PM2
   - Use environment-specific configuration
   - Set up health checks and monitoring

2. **UI Deployment**:
   - Build static assets
   - Deploy to static hosting or behind API proxy
   - Configure CORS for API communication

3. **Database Migrations**:
   - Run migrations from database package scripts
   - Use transaction-based migrations for safety
   - Create rollback mechanisms for failed migrations

### CI/CD Pipeline

1. **Build Pipeline**:
   - Detect changed packages
   - Build only affected packages
   - Run tests for affected packages
   - Generate deployment artifacts

2. **Deployment Pipeline**:
   - Deploy to staging environment first
   - Run integration tests
   - Deploy to production with approval
   - Configure rollback mechanisms

## 9. Performance Optimization

### Build Performance

1. **Parallel Building**:
   - Build packages in parallel when possible
   - Use dependency graph to determine build order
   - Cache build artifacts

2. **Test Optimization**:
   - Run tests only for affected packages
   - Parallelize test execution
   - Use test caching where appropriate

### Runtime Performance

1. **Shared Dependencies**:
   - Properly hoist common dependencies
   - Avoid duplicate dependencies
   - Use deduplication tools

2. **Code Splitting**:
   - Split code along package boundaries
   - Use dynamic imports where appropriate
   - Optimize bundle sizes

## 10. Implementation Tickets

### Phase 1: Monorepo Setup

1. **TICKET-1**: Initialize monorepo structure
   - Create packages directory
   - Set up root package.json with workspaces
   - Configure shared development dependencies

2. **TICKET-2**: Configure development tools
   - Set up ESLint, Prettier, and TypeScript at root
   - Configure Husky for pre-commit hooks
   - Set up shared scripts

### Phase 2: API Migration

3. **TICKET-3**: Migrate API code to packages/api
   - Move source code and tests
   - Update import paths
   - Configure API package.json

4. **TICKET-4**: Update API configuration
   - Configure environment variables
   - Update server initialization
   - Test API functionality

### Phase 3: UI Tester Migration

5. **TICKET-5**: Migrate UI tester to packages/ui-tester
   - Move source code
   - Update proxy configuration
   - Test UI functionality against API

### Phase 4: Database Package

6. **TICKET-6**: Create database package
   - Extract Supabase integration
   - Create repository interfaces
   - Move migration scripts

7. **TICKET-7**: Update API to use database package
   - Refactor database calls
   - Add integration tests
   - Verify production functionality

### Phase 5: Shared Package

8. **TICKET-8**: Create shared package
   - Extract common utilities
   - Create type definitions
   - Set up proper exports

9. **TICKET-9**: Update all packages to use shared
   - Refactor imports
   - Test cross-package functionality
   - Update documentation

### Phase 6: CI/CD and Deployment

10. **TICKET-10**: Configure CI/CD pipeline
    - Update GitHub Actions
    - Set up monorepo-aware testing
    - Configure deployment scripts

11. **TICKET-11**: Create production deployment workflow
    - Update PM2 configuration
    - Configure environment-specific settings
    - Test production deployment

### Phase 7: Documentation and Cleanup

12. **TICKET-12**: Update documentation
    - Create monorepo development guide
    - Update READMEs for each package
    - Document development workflows

13. **TICKET-13**: Final testing and optimization
    - Performance tests
    - Load tests
    - Security audit

## 11. Migration Risks and Mitigations

### Risks

1. **Breaking Changes**: Refactoring could introduce bugs
   - **Mitigation**: Comprehensive testing before, during, and after migration

2. **Dependency Conflicts**: Version conflicts between packages
   - **Mitigation**: Carefully manage versions, use workspace protocol

3. **Performance Degradation**: Monorepo could slow down development
   - **Mitigation**: Optimize build process, use caching

4. **Learning Curve**: Developers must learn monorepo patterns
   - **Mitigation**: Provide documentation and training

### Contingency Plan

1. **Rollback Strategy**: Maintain the original repo during migration
2. **Incremental Approach**: Migrate one package at a time
3. **Dual Operation**: Run both old and new structure in parallel during transition

## 12. Future Considerations

### Scaling the Monorepo

1. **New Package Types**:
   - Consider additional packages for:
     - Admin interface
     - Mobile applications
     - Analytics services

2. **Tooling Upgrades**:
   - Consider adopting advanced monorepo tools:
     - Turborepo for build optimization
     - Nx for advanced dependency management

### Maintenance Strategy

1. **Version Management**:
   - Determine versioning strategy:
     - Fixed versions across all packages
     - Independent versioning with compatibility constraints

2. **Contribution Guidelines**:
   - Update CONTRIBUTING.md for monorepo workflow
   - Establish PR templates for monorepo contributions

## 13. Conclusion

Converting to a monorepo structure offers significant advantages for the AI Fight Club API project. The separation of concerns into distinct packages while maintaining a unified codebase will improve code organization, dependency management, and development workflow.

The implementation can be completed within approximately 1-2 weeks, with minimal disruption to ongoing development. The most significant challenges will be managing the inter-package dependencies and ensuring proper communication patterns between packages.

The monorepo structure provides a foundation for future scaling, allowing new packages to be added easily while maintaining the benefits of centralized code management and coordinated releases.