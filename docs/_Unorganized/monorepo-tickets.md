# AI Fight Club Monorepo Migration Tickets

This document contains detailed tickets for implementing the monorepo migration plan. Each ticket includes specific acceptance criteria, implementation details, and potential challenges.

## Phase 1: Monorepo Setup

### MONO-001: Initialize monorepo structure

**Description:**  
Create the initial monorepo structure with workspace configuration and establish the foundation for the project organization.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Root package.json created with workspaces configuration
- Packages directory structure created with subdirectories for each package
- Turborepo configured for build optimization
- ESM and TypeScript interoperability configured
- .npmrc file configured for workspace dependencies
- .gitignore updated for monorepo patterns

**Implementation Details:**
1. Create root package.json with `"workspaces": ["packages/*"]`
2. Set up directory structure:
   ```
   packages/
     api/
     database/
     shared/
     ui-tester/
   ```
3. Install and configure Turborepo:
   ```bash
   npm install turbo --save-dev
   ```
4. Create turbo.json with pipeline configuration
5. Configure ESM compatibility for JavaScript packages
6. Set up TypeScript configuration for TS packages (shared, ui-tester)
7. Configure .npmrc for workspace protocol and dependency hoisting
8. Update .gitignore to include monorepo-specific entries

**Potential Challenges:**
- Ensuring proper dependency hoisting without conflicts
- Configuring ESM and TypeScript interoperability
- Ensuring backward compatibility during transition

### MONO-002: Configure development tools

**Description:**  
Set up shared development tools and configurations for consistent code quality across all packages.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- ESLint configured at root with package-specific overrides for JS and TS
- Prettier set up with consistent formatting rules
- Husky configured for pre-commit hooks
- Commitlint configured for conventional commits
- Docker development environment created
- Development scripts configured for local testing

**Implementation Details:**
1. Install and configure ESLint with both JS and TS support:
   ```bash
   npm install eslint eslint-plugin-import --save-dev
   # For TypeScript packages
   npm install @typescript-eslint/eslint-plugin @typescript-eslint/parser --save-dev
   ```
2. Create shareable ESLint config in config/eslint/ with package-specific overrides
3. Set up Prettier with consistent formatting rules
4. Configure Husky for pre-commit hooks:
   ```bash
   npm install husky --save-dev
   npx husky install
   ```
5. Add commitlint for enforcing conventional commits:
   ```bash
   npm install @commitlint/cli @commitlint/config-conventional --save-dev
   ```
6. Create docker-compose.yml for development environment
7. Set up development scripts in root package.json

**Potential Challenges:**
- Ensuring consistent rules across JavaScript and TypeScript packages
- Balancing strictness with developer productivity
- Docker networking between services

## Phase 2: API Migration

### MONO-003: Migrate API code to packages/api

**Description:**  
Move the existing API code into the packages/api directory and preserve the ESM structure and DDD architecture.

**Priority:** High  
**Estimated Effort:** 2 days

**Acceptance Criteria:**
- API source code moved to packages/api/src/
- ESM JavaScript structure preserved
- Package.json configured with "type": "module"
- Import paths updated for ESM compatibility
- DDD architecture properly maintained
- API starts successfully in the new structure

**Implementation Details:**
1. Create packages/api/package.json with appropriate dependencies and "type": "module"
2. Move source code to packages/api/src/ maintaining the DDD structure
3. Update all import paths for ESM compatibility:
   ```javascript
   // Before (may vary based on current structure)
   import { someUtil } from '../../utils';
   
   // After
   import { someUtil } from '../../utils.js';
   // or for package dependencies
   import { someUtil } from '@ai-fight-club/shared';
   ```
4. Ensure core DDD directories are preserved:
   - core/domain/ (entities, value objects, aggregates)
   - core/application/ (use cases, application services)
   - core/services/ (domain services)
   - infrastructure/ (repositories, external services)
   - interfaces/ (controllers, adapters)
5. Test API startup and functionality

**Potential Challenges:**
- ESM requires explicit file extensions (.js)
- Import path updates could be error-prone
- Ensuring DDD architecture is properly maintained

### MONO-004: Update API configuration and testing

**Description:**  
Configure environment, testing, and integration for the API package in the monorepo context.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Environment variables moved to .env files
- Jest configured for ESM JavaScript testing
- Integration tests set up with supertest
- Test fixtures and mocks implemented
- CI configuration created for API package
- All tests pass in the new structure

**Implementation Details:**
1. Move environment variables to packages/api/.env
2. Configure Jest for ESM JavaScript testing:
   ```bash
   npm install jest --save-dev -w @ai-fight-club/api
   ```
3. Create jest.config.js for API package with ESM support:
   ```javascript
   export default {
     testEnvironment: 'node',
     transform: {},
     extensionsToTreatAsEsm: ['.js'],
     moduleNameMapper: {
       '^(\\.{1,2}/.*)\\.js$': '$1',
     }
   };
   ```
4. Set up integration tests using supertest
5. Create test fixtures and mocks for database connections
6. Add CI configuration in .github/workflows/api.yml
7. Use Node's experimental VM modules flag for running tests:
   ```bash
   node --experimental-vm-modules node_modules/jest/bin/jest.js
   ```

**Potential Challenges:**
- Jest configuration for ESM can be complex
- Mocking cross-package dependencies
- Environment consistency between test and development

## Phase 3: UI Tester Migration

### MONO-005: Migrate UI tester to packages/ui-tester

**Description:**  
Move the existing UI tester code into the packages/ui-tester directory and modernize it with TypeScript and Vite.

**Priority:** Medium  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- UI tester code moved to packages/ui-tester/
- Code converted to TypeScript
- Vite configured for development and building
- Proxy configured for API communication
- Shared component library structure implemented
- UI starts successfully in the new structure

**Implementation Details:**
1. Create packages/ui-tester/package.json with dependencies
2. Move source code to packages/ui-tester/src/
3. Set up TypeScript configuration
4. Configure Vite:
   ```bash
   npm install vite @vitejs/plugin-react --save-dev -w @ai-fight-club/ui-tester
   ```
5. Create vite.config.ts with proxy settings
6. Set up shared component library structure
7. Test UI functionality against the API

**Potential Challenges:**
- TypeScript conversion for UI code
- Configuration of Vite for optimal development experience
- Ensuring proper communication with the API

### MONO-006: Enhance UI tester functionality

**Description:**  
Improve the UI tester with enhanced visualization features, documentation, and testing tools.

**Priority:** Medium  
**Estimated Effort:** 2 days

**Acceptance Criteria:**
- API response visualization implemented
- Interactive documentation created
- Test case management features added
- Performance monitoring dashboard implemented
- Comprehensive UI tests set up
- UI is visually consistent and user-friendly

**Implementation Details:**
1. Create visualization components for API responses
2. Implement interactive documentation using OpenAPI specs
3. Add test case management functionality
4. Create performance monitoring dashboard
5. Set up UI tests using Testing Library
6. Ensure visual consistency with a design system

**Potential Challenges:**
- Complexity of visualization components
- Integration with OpenAPI documentation
- Testing UI components effectively

## Phase 4: Database Package

### MONO-007: Create database package

**Description:**  
Extract database functionality into a separate package for better separation of concerns.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Supabase integration moved to packages/database/
- ESM JavaScript structure maintained
- Repository implementations created for data access
- Database models created
- Migration and seeding scripts set up
- API successfully uses the database package

**Implementation Details:**
1. Create packages/database/package.json with dependencies and "type": "module"
2. Move Supabase integration code to packages/database/src/
3. Implement repository pattern for each entity:
   ```javascript
   // packages/database/src/repositories/userRepository.js
   export function createUserRepository(supabaseClient) {
     return {
       async findById(id) {
         const { data, error } = await supabaseClient
           .from('users')
           .select('*')
           .eq('id', id)
           .single();
           
         if (error) throw error;
         return data;
       },
       // Other methods...
     };
   }
   ```
4. Create database models
5. Set up migration and seeding scripts
6. Test API integration with the database package

**Potential Challenges:**
- Maintaining ESM compatibility
- Proper error handling across package boundaries
- Ensuring domain models can be properly constructed from repository data

### MONO-008: Implement database versioning and migrations

**Description:**  
Create a robust system for database schema versioning and migrations.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Schema versioning system implemented
- Migration runner created
- Transaction-based migrations implemented
- Rollback mechanisms created
- Database health checks implemented
- Migrations can be run from CI/CD pipeline

**Implementation Details:**
1. Create schema versioning system:
   ```javascript
   // packages/database/src/migrations/types.js
   export class Migration {
     constructor(version, name, up, down) {
       this.version = version;
       this.name = name;
       this.up = up;
       this.down = down;
     }
   }
   ```
2. Implement migration runner
3. Make migrations transaction-based for safety
4. Create rollback functionality
5. Add database health checks
6. Configure CI/CD to run migrations

**Potential Challenges:**
- Handling complex schema changes
- Testing migrations thoroughly
- Ensuring data integrity during migrations
- Managing environment-specific migrations

## Phase 5: Shared Package

### MONO-009: Create shared package foundation

**Description:**  
Create a shared package for DTOs, interfaces, and common utilities.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Shared package set up with TypeScript
- DTOs created for cross-package communication
- Shared validation schemas implemented
- Common utility functions created
- TypeScript configuration for ESM output
- Other packages can import and use shared code

**Implementation Details:**
1. Create packages/shared/package.json with dependencies
2. Set up TypeScript configuration for ESM output
3. Create DTOs for API entities:
   ```typescript
   // packages/shared/src/dto/UserDTO.ts
   export interface UserDTO {
     id: string;
     email: string;
     name: string;
     created_at: string;
     updated_at: string;
     // Only data, no behavior
   }
   ```
4. Implement shared validation schemas with Zod
5. Create common utility functions
6. Test importing shared code in other packages

**Potential Challenges:**
- Avoiding domain logic in DTOs
- Ensuring clean separation from domain models
- Avoiding circular dependencies

### MONO-010: Implement cross-package communication patterns

**Description:**  
Establish proper patterns for communication between packages while preserving domain boundaries.

**Priority:** Medium  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Clean interfaces established for package boundaries
- Domain model to DTO conversion implemented
- Domain logic properly encapsulated in API package
- Contract testing between packages implemented
- Cross-package communication patterns documented

**Implementation Details:**
1. Create mapping functions in API package to convert domain models to DTOs:
   ```javascript
   // packages/api/src/interfaces/mappers/userMapper.js
   import { UserDTO } from '@ai-fight-club/shared';
   
   export function toDTO(userModel) {
     return {
       id: userModel.id,
       email: userModel.email.value,
       name: userModel.name,
       created_at: userModel.createdAt,
       updated_at: userModel.updatedAt
     };
   }
   ```
2. Implement proper boundary protection in controllers
3. Create contract tests to validate communication
4. Ensure no domain logic leaks into other packages
5. Document proper usage patterns and anti-patterns

**Potential Challenges:**
- Maintaining clean DDD boundaries
- Preventing domain logic leakage
- Ensuring performant data transformations

## Phase 6: CI/CD and Deployment

### MONO-011: Configure CI/CD pipeline

**Description:**  
Set up a comprehensive CI/CD pipeline optimized for the monorepo structure.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- GitHub Actions configured for CI
- Caching and optimization implemented
- Conditional builds based on changed files
- Test reporting and code coverage set up
- Deployment automation implemented
- Pipeline is efficient and reliable

**Implementation Details:**
1. Create .github/workflows/ci.yml with:
   - Checkout with Git history
   - Dependency caching
   - Conditional build steps
   - Test execution with ESM support
   - Linting
2. Configure Turborepo for affected packages:
   ```yaml
   - name: Build affected
     run: npm run build:affected
   ```
3. Set up test reporting and code coverage
4. Create deployment workflow
5. Test and optimize the pipeline

**Potential Challenges:**
- Configuring Jest for ESM in CI
- Efficient caching for monorepo
- Determining affected packages accurately

### MONO-012: Create production deployment workflow

**Description:**  
Establish a robust process for deploying to different environments with proper safeguards.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Environments configured (dev, staging, production)
- Canary deployments implemented
- Monitoring and alerting set up
- Rollback mechanisms created
- Infrastructure-as-code implemented
- Deployment process is documented

**Implementation Details:**
1. Configure environment-specific settings
2. Implement canary deployment process:
   ```yaml
   - name: Deploy canary
     run: npm run deploy:canary
   ```
3. Set up monitoring and alerting
4. Create automated rollback triggers
5. Implement infrastructure using Terraform or similar
6. Document the deployment process

**Potential Challenges:**
- Environment-specific configurations
- Zero-downtime deployments
- Monitoring integration across environments
- Automated rollback reliability

## Phase 7: Documentation and Maintenance

### MONO-013: Create comprehensive documentation

**Description:**  
Create detailed documentation for the monorepo structure, development workflow, and architecture.

**Priority:** Medium  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Monorepo architecture and DDD implementation documented
- Package-specific documentation created
- API endpoints and schemas documented
- Architectural diagrams created
- Troubleshooting guides written
- Documentation is accessible and up-to-date

**Implementation Details:**
1. Document monorepo architecture and DDD implementation:
   - Package structure and responsibilities
   - Domain model principles and patterns
   - Cross-package communication guidelines
   - ESM and TypeScript interoperability
2. Create package-specific READMEs
3. Document API endpoints using OpenAPI
4. Create architectural diagrams
5. Write troubleshooting guides
6. Ensure documentation is accessible to all developers

**Potential Challenges:**
- Clearly explaining DDD concepts
- Keeping documentation up-to-date
- Balancing detail with readability

### MONO-014: Implement maintenance tools

**Description:**  
Set up tools and processes for maintaining the monorepo over time.

**Priority:** Medium  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Dependency update workflow implemented
- Security scanning set up
- Performance benchmarking created
- Health monitoring dashboard implemented
- Logging and analytics configured
- Maintenance processes are documented

**Implementation Details:**
1. Create dependency update workflow:
   ```yaml
   - name: Check for outdated dependencies
     run: npm run deps:check
   ```
2. Implement security scanning with tools like Snyk
3. Set up performance benchmarking
4. Create health monitoring dashboard
5. Configure logging and analytics
6. Document maintenance processes and schedules

**Potential Challenges:**
- Automating dependency updates safely
- Balancing security with functionality
- Creating meaningful performance benchmarks
- Resource requirements for monitoring

## Final Verification and Handover

### MONO-015: Final testing and verification

**Description:**  
Conduct comprehensive testing of the entire monorepo to ensure everything works as expected.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- All unit tests passing across packages
- Integration tests passing
- End-to-end tests passing
- Performance benchmarks meeting targets
- Security scans passing
- Production deployment tested
- Documentation reviewed and verified

**Implementation Details:**
1. Run comprehensive test suite across all packages
2. Conduct performance testing
3. Run security scans
4. Test production deployment process
5. Review and update documentation
6. Create final verification report

**Potential Challenges:**
- Identifying subtle integration issues
- Testing under realistic load conditions
- Verifying all edge cases

### MONO-016: Team training and handover

**Description:**  
Ensure the team is comfortable with the new monorepo structure and development workflow.

**Priority:** High  
**Estimated Effort:** 1 day

**Acceptance Criteria:**
- Training sessions conducted
- Development guides reviewed with team
- Common workflows demonstrated
- Troubleshooting scenarios practiced
- Team feedback collected and addressed
- Support plan established for the transition period

**Implementation Details:**
1. Prepare training materials
2. Conduct hands-on workshop sessions
3. Walk through common development workflows
4. Practice troubleshooting scenarios
5. Collect and address team feedback
6. Establish support plan for the transition period

**Potential Challenges:**
- Varying levels of experience among team members
- Resistance to workflow changes
- Time constraints for training

## Total Estimated Effort: 19 days (3-4 weeks with buffer) 