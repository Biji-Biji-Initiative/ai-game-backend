# Changelog

## TypeScript API Admin UI Improvements

### Critical Fixes:
- Fixed missing AuthManager registration in AppBootstrapper
- Updated package.json to include dotenv and other dependencies in correct section
- Fixed type mismatches in DomainStateViewer and AppController
- Resolved circular dependency between AppController and FlowController

### TypeScript Improvements:
- Replaced most `any` types with specific interfaces and types
- Added proper ApiRequest, ApiResponse, and ApiErrorData interfaces for API client
- Created proper global.d.ts file with type declarations
- Updated ESLint rules to error on explicit any
- Enabled strict TypeScript checking with noUnusedLocals and noUnusedParameters
- Fixed various type issues throughout the codebase

### Architectural Improvements:
- Converted server.js to use ES modules instead of CommonJS
- Moved all UI dependencies from devDependencies to dependencies
- Added proper API client error handling
- Added type-safe event emission with generic type parameter
- Updated .gitignore to exclude build artifacts and logs

### Documentation and Maintenance:
- Added JSDoc comments for better code documentation
- Created this changelog to track improvements
- Setup proper file structure for TypeScript type declarations
- Provided better error handling throughout the codebase

### Build System:
- Added lint:js:fix script for fixing linting issues
- Updated tsconfig.json for stricter type checking
- Added type definitions for dependencies (@types/*)
- Configured package.json with type: "module" for ES modules support 