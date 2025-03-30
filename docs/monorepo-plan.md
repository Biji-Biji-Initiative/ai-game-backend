# Monorepo Implementation Plan for AI Fight Club API

## 1. Current Project Assessment

The current project structure consists of:

- **Main API Service**: A Node.js Express application (with ESM modules)
- **API Tester UI**: A separate UI for testing API endpoints
- **Database Layer**: Supabase integration for data storage and authentication
- **Scripts & Tools**: Various utility scripts for development, testing, and deployment
- **Documentation**: Multiple markdown files with implementation details
- **Domain-Driven Design**: Core domain logic implementing DDD principles

### Current Pain Points

- **Code Duplication**: Common utilities duplicated across projects
- **Dependency Synchronization**: Difficult to maintain consistent dependency versions
- **Testing Overhead**: Integration testing between components is complex
- **Deployment Coordination**: Versioning and releasing related components is manual
- **Development Workflow**: Developers need to manage multiple repositories
- **Domain Logic Access**: Difficult to properly use domain objects across boundaries

## 2. Is a Monorepo a Good Idea?

### Advantages of Moving to a Monorepo:

1. **Centralized Code Management**: All related packages in one repository
2. **Simplified Dependency Management**: Share common dependencies across packages
3. **Atomic Changes**: Make related changes across multiple packages in a single commit
4. **Consistent Tooling**: Share configuration for linting, testing, and building
5. **Easier Collaboration**: Developers can see and understand the entire system
6. **Coordinated Versioning**: Ensure compatibility between related packages
7. **Unified CI/CD**: Streamline testing and deployment across packages
8. **Code Sharing**: Easier to extract and share common utilities
9. **Cross-Package Refactoring**: Ability to make cross-cutting changes safely
10. **Simplified Onboarding**: New developers can understand the entire system

### Disadvantages:

1. **Repository Size**: May grow large over time, affecting clone times
2. **Learning Curve**: New monorepo tooling requires team education
3. **Build Complexity**: May require more sophisticated build tooling
4. **Performance Challenges**: CI/CD pipelines may need optimization for large monorepos
5. **Initial Setup Overhead**: Higher upfront cost for tooling configuration
6. **Release Management Complexity**: Requires deliberate release strategy
7. **Git History Management**: Can become cluttered without proper conventions

### Conclusion:

A monorepo structure would be beneficial for this project because:

- The project already has distinct components (API, UI tester, database)
- There are shared dependencies and utilities
- The components interact closely with each other
- The project benefits from coordinated versioning and releases
- The codebase size is manageable and not expected to grow excessively
- Team size and collaboration patterns will benefit from unified access
- DDD architecture can be preserved while allowing for proper cross-package communication

## 3. Monorepo Structure

The proposed monorepo structure:

```
ai-fight-club-monorepo/
├── package.json                 # Root package.json for workspace configuration
├── package-lock.json            # Lock file for the entire monorepo
├── .github/                     # GitHub workflows and configuration
│   ├── workflows/               # CI/CD pipeline definitions
│   └── actions/                 # Custom GitHub actions
├── .husky/                      # Husky git hooks
├── docker/                      # Docker configurations for development and deployment
│   ├── dev/                     # Development environment
│   └── prod/                    # Production environment
├── packages/
│   ├── api/                     # Core API service (pure ESM JavaScript)
│   │   ├── package.json         # Type: "module"
│   │   ├── src/
│   │   │   ├── domain/          # Domain model, entities, value objects
│   │   │   │   ├── entities/    # Domain entities 
│   │   │   │   ├── valueObjects/ # Value objects
│   │   │   │   ├── services/    # Domain services
│   │   │   │   └── ports/       # Interfaces for external dependencies
│   │   │   │       └── repositories/ # Repository interfaces (Ports)
│   │   │   ├── application/     # Application services, use cases
│   │   │   ├── infrastructure/  # External integrations, persistence, DI container
│   │   │   │   └── di/          # Dependency injection setup
│   │   │   └── interfaces/      # API controllers, adapters
│   │   ├── tests/
│   │   │   ├── unit/            # Unit tests
│   │   │   └── integration/     # Integration tests
│   │   └── ...
│   ├── ui-tester/               # API testing UI (TypeScript)
│   │   ├── package.json
│   │   ├── public/
│   │   ├── src/
│   │   └── ...
│   ├── database/                # Database layer & Supabase integration (ESM JavaScript)
│   │   ├── package.json         # Type: "module"
│   │   ├── migrations/
│   │   ├── schema/
│   │   ├── src/
│   │   │   ├── repositories/    # Repository implementations (Adapters)
│   │   │   ├── mappers/         # Data mappers between DB and domain
│   │   │   └── client/          # Database client configuration
│   │   └── ...
│   └── shared/                  # Shared utilities and types (TypeScript)
│       ├── package.json
│       ├── src/
│       │   ├── types/           # TypeScript interfaces (not domain models)
│       │   ├── utils/           # Shared utilities
│       │   ├── dto/             # Data Transfer Objects
│       │   └── constants/       # Shared constants
│       └── ...
├── tools/                       # Monorepo-level tools 
├── config/                      # Shared configurations
└── docs/                        # Project documentation
```

### Package Boundaries and Responsibilities

#### `@ai-fight-club/api`
- Core API service implementation (pure ESM JavaScript)
- REST endpoint controllers and adapters
- Full Domain-Driven Design implementation
  - Domain model, entities, aggregates, value objects
  - Application services and use cases
  - Domain services and business logic
  - Repository interfaces (Ports) - following Dependency Inversion Principle
- Infrastructure implementations (external services, DI container)
- Authentication and authorization middleware

#### `@ai-fight-club/database`
- Supabase client configuration and initialization (ESM JavaScript)
- Database schema definitions
- Migration scripts and versioning
- Repository implementations (Adapters) that implement interfaces from api package
- Database utility functions and helpers
- Data mappers between database records and domain entities
- Contains ONLY infrastructure code - no domain logic
- No business rules or domain validation

#### `@ai-fight-club/ui-tester`
- API testing user interface (TypeScript)
- Visualization of API responses
- Mock data generation
- Test case management
- Performance monitoring UI

#### `@ai-fight-club/shared`
- TypeScript interfaces for cross-package communication
- Data Transfer Objects (DTOs) for API requests/responses
- Shared validation schemas
- Utility functions used by multiple packages
- Error classes and handling
- Logging configuration

### Domain-Driven Design Architecture

The monorepo structure preserves the DDD architecture within the API package:

1. **Domain Layer**: Contains all domain models, entities, aggregates, value objects, domain events, domain services, and repository interfaces (Ports)
2. **Application Layer**: Contains application services, use cases, commands, and queries
3. **Infrastructure Layer**: Contains DI container, external services, and other technical infrastructure
4. **Interface Layer**: Contains controllers, request/response models, and adapters

Cross-package communication will use DTOs and interfaces defined in the shared package, not actual domain models.

## ESM JavaScript Import Requirements

All JavaScript packages in this monorepo use ESM modules (`"type": "module"`). This requires special attention to imports:

### Required: File Extensions in Imports

```javascript
// CORRECT - With file extension
import { User } from './models/User.js';
import { createLogger } from '../utils/logger.js';

// INCORRECT - Missing file extension
import { User } from './models/User';
import { createLogger } from '../utils/logger';
```

### Internal Package Imports

```javascript
// Importing from another package
import { UserDTO } from '@ai-fight-club/shared';

// Importing internal implementation from another package (avoid when possible)
import { UserRepository } from '@ai-fight-club/api/src/domain/ports/repositories/UserRepository.js';
```

### Dynamic Imports

```javascript
// Dynamic imports (useful for CommonJS interoperability)
const module = await import('some-module');
const { something } = module.default;
```

## Dependency Injection Strategy

To properly implement the Dependency Inversion Principle, we will use a simple dependency injection container:

### API Package DI Setup

```javascript
// packages/api/src/infrastructure/di/container.js
import { createUserRepository } from '@ai-fight-club/database';
import { createSupabaseClient } from '@ai-fight-club/database';

export function createContainer() {
  const supabaseClient = createSupabaseClient();
  
  return {
    // Repositories
    userRepository: createUserRepository(supabaseClient),
    
    // Services
    // ...
  };
}
```

### Using DI in Application Services

```javascript
// packages/api/src/application/services/UserService.js
export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async getUserById(id) {
    return this.userRepository.findById(id);
  }
}

// Usage in API
import { container } from '../infrastructure/di/container.js';
const userService = new UserService(container.userRepository);
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
   - Move src/ to packages/api/src/ preserving ESM structure
   - Ensure package.json includes "type": "module"
   - Update package.json to include API-specific dependencies
   - Move API-specific tests to packages/api/tests/
   - Preserve the DDD architecture within the API package

2. **Update Configuration**
   - Move API-specific env variables to packages/api/.env
   - Update CI configuration for API package
   - Update scripts for running API in isolation
   - Configure PM2 to work with the new structure

3. **Refactor Entry Points**
   - Update server.js and index.js for the new paths
   - Ensure proper error handling across boundaries
   - Maintain ESM imports/exports

### Phase 3: Migrate UI Tester (1 day)

1. **Move UI Tester Code**
   - Move api-tester-ui/ contents to packages/ui-tester/
   - Update proxy configuration in server.js to point to new API location
   - Adjust package.json to reference correct workspace dependencies
   - Update static file references to match new paths
   - Convert to TypeScript if beneficial

2. **Configure UI Dependencies**
   - Move UI-specific dependencies to ui-tester package.json
   - Set up proper development scripts
   - Configure static asset management
   - Set up TypeScript configuration

### Phase 4: Create Database Package (1 day)

1. **Extract Database Layer**
   - Move supabase/ directory to packages/database/
   - Extract Supabase-specific code from API to database package
   - Create clean repository interfaces for data access
   - Export database client and utility functions
   - Update connection handling for production mode
   - Maintain ESM structure with "type": "module"

2. **Configure Schema and Migrations**
   - Move schema definitions to database package
   - Configure migration scripts at database package level
   - Create utility functions for schema validation
   - Set up versioning for database schema

### Phase 5: Build Shared Package (1 day)

1. **Create Shared Utilities**
   - Identify common utilities like logging, validation, and error handling
   - Move to packages/shared/src/utils/
   - Create index.ts exports for easy importing
   - Set up TypeScript configuration

2. **Create Interface Definitions**
   - Create TypeScript interfaces for cross-package communication
   - Define Data Transfer Objects (DTOs) for API requests/responses
   - Set up proper module exports
   - Configure path aliases for easier imports
   - Ensure no domain logic leaks into shared package

### Phase 6: Build System and Tooling (2 days)

1. **Setup Root Scripts**
   - Configure scripts in root package.json to run operations across workspaces
   - Set up concurrent processes for dev mode
   - Configure build order for dependencies
   - Create utility scripts for common operations

2. **Implement Turborepo for Build Optimization**
   - Install and configure Turborepo for optimized builds
   - Set up dependency graph for proper build ordering
   - Configure caching for faster incremental builds
   - Create pipeline configuration for various tasks (build, test, lint)
   - Configure mixed JavaScript/TypeScript builds

3. **Configure Package-Specific Testing**
   - Set up Jest for each package with appropriate configurations
   - Configure unit testing for each package
   - Set up integration testing for API
   - Configure end-to-end testing if needed

4. **Docker Development Environment**
   - Create Docker Compose setup for local development
   - Configure service dependencies and networking
   - Set up volume mounting for code changes
   - Create development and production Docker configurations

### Phase 7: CI/CD and Deployment (2 days)

1. **Update CI/CD Pipeline**
   - Update GitHub Actions to understand monorepo structure
   - Configure caching for faster builds
   - Set up conditional builds based on changed files
   - Configure deployment scripts for each package

2. **Implement Deployment Strategy**
   - Configure staging and production environments
   - Set up canary deployment process
   - Create rollback mechanisms
   - Implement health checks and monitoring

3. **Configure Versioning Strategy**
   - Implement Conventional Commits standard
   - Set up automatic changelog generation
   - Configure versioning automation with Lerna or similar tool
   - Create release workflow

## 5. Technical Implementation Details

### Dependency Management Strategy

#### Root Package.json

```json
{
  "name": "ai-fight-club-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"packages/*/src/**/*.{js,ts,json,md}\"",
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.4.3",
    "@commitlint/config-conventional": "^18.4.3",
    "concurrently": "^8.2.2",
    "eslint": "^9.0.0",
    "husky": "^9.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0"
  },
  "packageManager": "npm@9.8.1"
}
```

#### Turbo Configuration (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### .npmrc Configuration

```
# Set strict-peer-dependencies to false to avoid issues with peer dependencies
strict-peer-dependencies=false

# Enable hoisting to reduce duplication
hoist=true

# Use workspace protocol for local packages
save-workspace-protocol=true
```

### API Package.json (ESM JavaScript)

```json
{
  "name": "@ai-fight-club/api",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "lint": "eslint src --ext .js",
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
    "eslint": "^9.0.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "supertest": "^7.1.0"
  }
}
```

### Database Package.json (ESM JavaScript)

```json
{
  "name": "@ai-fight-club/database",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "migrate": "node src/scripts/run-migrations.js",
    "seed": "node src/scripts/seed-data.js",
    "lint": "eslint src --ext .js"
  },
  "dependencies": {
    "@ai-fight-club/shared": "workspace:^",
    "@supabase/supabase-js": "^2.49.3",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "jest": "^29.7.0"
  }
}
```

### Shared Package.json (TypeScript)

```json
{
  "name": "@ai-fight-club/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc -b",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "winston": "^3.17.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.10.0",
    "eslint": "^9.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.3"
  }
}
```

### UI Tester Package.json (TypeScript)

```json
{
  "name": "@ai-fight-club/ui-tester",
  "version": "1.0.0",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@ai-fight-club/shared": "workspace:^",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^9.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0"
  }
}
```

## 6. TypeScript Configuration and ESM Interoperability

### Shared Package tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### UI Tester tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

### ESM in JavaScript Packages

For the JavaScript packages (API and Database), ensure ESM compatibility:

1. Use `.js` extension in imports:
   ```javascript
   // Correct
   import { something } from './module.js';
   
   // Incorrect in ESM
   import { something } from './module';
   ```

2. Use proper import syntax for CommonJS packages:
   ```javascript
   // For CommonJS packages that don't support ESM properly
   import pkg from 'some-package';
   const { something } = pkg;
   ```

3. Package.json type field:
   ```json
   {
     "type": "module"
   }
   ```

## 7. Domain-Driven Design in the Monorepo

The key to preserving DDD architecture in a monorepo is maintaining proper boundaries:

### Domain Layer (in API Package)

```javascript
// packages/api/src/domain/entities/User.js
export class User {
  constructor(id, email, name) {
    this.id = id;
    this.email = email;
    this.name = name;
  }
  
  // Domain logic and behavior
  hasPermission(permission) {
    // Implementation
  }
}
```

### Value Objects (in API Package)

```javascript
// packages/api/src/domain/valueObjects/Email.js
export class Email {
  constructor(value) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email');
    }
    this._value = value;
  }
  
  isValid(email) {
    // Validation logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  get value() {
    return this._value;
  }
}
```

### Repository Interfaces (in API Package)

```javascript
// packages/api/src/domain/ports/repositories/UserRepository.js
export class UserRepository {
  /**
   * @param {string} id 
   * @returns {Promise<User>}
   */
  findById(id) { throw new Error('Method not implemented') }
  
  // Other methods...
}
```

### Repository Implementations (in Database Package)

```javascript
// packages/database/src/repositories/userRepository.js
import { UserRepository } from '@ai-fight-club/api/src/domain/ports/repositories/UserRepository.js';

export function createUserRepository(supabaseClient) {
  return {
    async findById(id) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return mapToUserDomain(data); // Convert DB record to domain entity
    },
    // Other methods...
  };
}
```

### DTOs for Cross-Package Communication (in Shared Package)

```typescript
// packages/shared/src/dto/UserDTO.ts
export interface UserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  // Only data, no behavior
}
```

### Cross-Package Communication

```javascript
// In API package
import { UserDTO } from '@ai-fight-club/shared';

// Convert domain model to DTO for external use
function toDTO(user) {
  return {
    id: user.id,
    email: user.email.value,
    name: user.name,
    createdAt: user.createdAt
  };
}

// Controller returns DTO, not domain model
app.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(toDTO(user));
});
```

## 8. Docker Development Environment

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: docker/dev/api.Dockerfile
    volumes:
      - ./packages/api:/app/packages/api
      - ./packages/shared:/app/packages/shared
      - ./packages/database:/app/packages/database
      - node_modules:/app/node_modules
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - database
    command: npm run dev:api

  ui-tester:
    build:
      context: .
      dockerfile: docker/dev/ui.Dockerfile
    volumes:
      - ./packages/ui-tester:/app/packages/ui-tester
      - ./packages/shared:/app/packages/shared
      - node_modules:/app/node_modules
    ports:
      - "3001:3001"
    env_file:
      - .env
    depends_on:
      - api
    command: npm run dev:ui

volumes:
  node_modules:
```

## 9. Implementation Tickets

### Phase 1: Monorepo Setup

1. **MONO-001**: Initialize monorepo structure
   - Create packages directory and workspace configuration
   - Set up root package.json with workspaces
   - Configure shared development dependencies and tools
   - Implement Turborepo for build optimization
   - Configure ESM and TypeScript interoperability

2. **MONO-002**: Configure development tools
   - Set up ESLint, Prettier at root
   - Configure Husky for pre-commit hooks
   - Set up commitlint for conventional commits
   - Create Docker development environment
   - Configure development scripts for local testing

### Phase 2: API Migration

3. **MONO-003**: Migrate API code to packages/api
   - Move source code to packages/api/src/
   - Preserve ESM JavaScript structure
   - Configure package.json with "type": "module"
   - Ensure the DDD architecture is properly maintained
   - Update import paths for ESM compatibility

4. **MONO-004**: Update API configuration and testing
   - Move environment variables to .env files
   - Configure Jest for ESM JavaScript testing
   - Set up integration tests
   - Implement test fixtures and mocks
   - Create CI configuration for API package

### Phase 3: UI Tester Migration

5. **MONO-005**: Migrate UI tester to packages/ui-tester
   - Move source code to packages/ui-tester/
   - Convert to TypeScript
   - Set up Vite for development and building
   - Configure proxy for API communication
   - Implement shared component library

6. **MONO-006**: Enhance UI tester functionality
   - Add API response visualization
   - Create interactive documentation
   - Implement test case management
   - Add performance monitoring dashboard
   - Set up comprehensive UI tests

### Phase 4: Database Package

7. **MONO-007**: Create database package
   - Extract Supabase integration to packages/database/
   - Maintain ESM JavaScript structure
   - Implement repository implementations
   - Create database models
   - Set up migration and seeding scripts
   - Ensure proper interfaces for domain model interaction

8. **MONO-008**: Implement database versioning and migrations
   - Create schema versioning system
   - Implement migration runner
   - Set up transaction-based migrations
   - Create rollback mechanisms
   - Implement database health checks

### Phase 5: Shared Package

9. **MONO-009**: Create shared package foundation
   - Set up packages/shared/ with TypeScript
   - Create DTOs for cross-package communication
   - Implement shared validation schemas
   - Create common utility functions
   - Set up TypeScript configuration for ESM output

10. **MONO-010**: Implement cross-package communication patterns
    - Create clean interfaces for package boundaries
    - Implement proper domain model to DTO conversion
    - Ensure domain logic remains in API package
    - Create contract testing between packages
    - Document cross-package communication patterns

### Phase 6: CI/CD and Deployment

11. **MONO-011**: Configure CI/CD pipeline
    - Set up GitHub Actions for continuous integration
    - Configure caching and optimization
    - Implement conditional builds based on changed files
    - Set up test reporting and code coverage
    - Create deployment automation

12. **MONO-012**: Create production deployment workflow
    - Configure environments (dev, staging, production)
    - Implement canary deployments
    - Set up monitoring and alerting
    - Create rollback mechanisms
    - Implement infrastructure-as-code

### Phase 7: Documentation and Maintenance

13. **MONO-013**: Create comprehensive documentation
    - Document monorepo architecture and DDD implementation
    - Create package-specific documentation
    - Document API endpoints and schemas
    - Create architectural diagrams
    - Write troubleshooting guides

14. **MONO-014**: Implement maintenance tools
    - Create dependency update workflow
    - Implement security scanning
    - Set up performance benchmarking
    - Create health monitoring dashboard
    - Implement logging and analytics

## 10. Migration Risks and Mitigations

### Risks

1. **ESM Compatibility**: Some packages may not support ESM properly
   - **Mitigation**: Identify problematic dependencies early
   - **Mitigation**: Create wrapper modules for CommonJS dependencies
   - **Mitigation**: Use dynamic imports where necessary

2. **Domain Logic Leakage**: Domain logic might leak into other packages
   - **Mitigation**: Clear boundaries between domain model and DTOs
   - **Mitigation**: Code reviews focused on maintaining DDD principles
   - **Mitigation**: Documentation on proper package communication

3. **Package Dependency Cycles**: Risk of circular dependencies
   - **Mitigation**: Clear architecture with unidirectional dependencies
   - **Mitigation**: Use dependency visualization tools
   - **Mitigation**: Regular dependency audits

4. **Mixed JavaScript/TypeScript Development**: Challenges with interoperability
   - **Mitigation**: Proper TypeScript configuration for ESM output
   - **Mitigation**: Clear contracts between JS and TS packages
   - **Mitigation**: Type definitions for JavaScript packages

5. **Deployment Complexity**: Multiple packages need coordinated deployment
   - **Mitigation**: Automated deployment pipeline
   - **Mitigation**: Versioning strategy with lockstep releases
   - **Mitigation**: Comprehensive testing before deployment

### Contingency Plan

1. **Rollback Strategy**:
   - Maintain the original repo structure during migration
   - Create rollback points at critical phases
   - Test rollback procedures before migration

2. **Incremental Validation**:
   - Test each package in isolation after migration
   - Validate cross-package communication
   - Run comprehensive integration tests

## 11. Future Considerations

### Scaling the Monorepo

1. **New Package Types**:
   - Admin interface for managing the platform
   - Analytics services for tracking usage and performance
   - Next.js frontend for user-facing interface
   - Mobile applications for iOS and Android
   - Notification service for emails and push notifications

2. **Infrastructure Packages**:
   - Shared infrastructure-as-code package
   - Monitoring and observability package
   - Security and compliance package
   - Feature flag management package
   - Performance testing and benchmarking package

### Advanced Tooling

1. **Enhanced Monorepo Tools**:
   - Nx for advanced dependency graph management
   - Custom tooling for DDD validation
   - Schema validation tools for package contracts

2. **Developer Experience Improvements**:
   - Customized VS Code extensions
   - Interactive documentation with playground
   - DDD validation tools

### Maintenance Strategy

1. **Version Management Strategies**:
   - Independent versioning with compatibility matrix
   - Lockstep versioning for tightly coupled packages
   - Automated version bumping based on changes
   - Semantic versioning enforcement
   - Version compatibility validation

2. **Contribution Guidelines**:
   - Detailed PR templates for different package types
   - Domain model modification guidelines
   - Cross-package communication patterns

3. **Long-term Sustainability**:
   - Regular dependency audits and updates
   - Domain model evolution guidelines
   - Technical debt tracking and reduction
   - Domain knowledge sharing and documentation

## 12. Conclusion

Converting to a monorepo structure offers significant advantages for the AI Fight Club API project. The separation of concerns into distinct packages while maintaining a unified codebase will improve code organization, dependency management, and development workflow.

By preserving the DDD architecture within the API package and establishing clear boundaries between packages, we ensure that the domain logic remains properly encapsulated while enabling clean communication between components. 

The JavaScript (ESM) and TypeScript combination allows us to maintain the existing backend code while adding type safety where beneficial. This approach provides flexibility while ensuring maintainability and scalability.

The implementation plan provides a structured approach with clear phases, risks, and mitigations. By following this plan, the team can successfully implement a modern monorepo structure that supports the long-term growth and evolution of the AI Fight Club platform.