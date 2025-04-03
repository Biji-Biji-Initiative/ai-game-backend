# API Admin Application

A browser-based interface for managing API requests, flows, and configurations.

## Project Overview

This application provides a user-friendly interface for API testing, managing request flows, and tracking API state. It's designed for developers, testers, and non-technical users who need to interact with APIs.

Key features:
- Create and manage API request sequences (flows)
- Test API endpoints with customizable parameters
- Track API state and history
- Extract and reuse variables across requests
- View detailed response information

## Refactoring Process

This project is currently undergoing a major refactoring to address architectural issues and improve code quality. See [REFACTORING.md](./REFACTORING.md) for detailed information about the refactoring process.

### Architectural Improvements

1. **Clear Separation of Concerns**
   - UI rendering logic separated from business logic
   - Storage operations abstracted through service interfaces
   - Improved module organization

2. **Dependency Injection**
   - Components receive dependencies through constructors
   - Services registered in a central dependency container
   - Improved testability and loose coupling

3. **Type Safety**
   - Comprehensive interface definitions
   - Generic type usage for improved type safety
   - Strict TypeScript configuration

### Current Status

The refactoring is well underway with these key milestones achieved:
- Created proper service abstractions (StorageService, DomService, FlowUIService)
- Refactored FlowController to use the new abstractions
- Improved AppBootstrapper with proper dependency injection
- Added comprehensive type interfaces

### Next Steps

If you're continuing the refactoring work, focus on these areas:
1. Resolve the type mismatches in AppBootstrapper.ts (see linter errors)
2. Continue refactoring controllers to use the new service abstractions
3. Fix any circular dependencies between modules
4. Implement unit tests for the refactored components

Run `npm run lint` to see the current linter errors that need to be addressed.

### Directory Structure

- `/admin/js/`
  - `/api/` - API client implementations
  - `/components/` - UI components
  - `/controllers/` - Business logic controllers
  - `/core/` - Core framework components
  - `/modules/` - Feature modules
  - `/services/` - Service abstractions
  - `/types/` - TypeScript interfaces and types
  - `/utils/` - Utility functions and helpers

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Running Tests

```bash
npm test
```

## Contributing

1. See the [REFACTORING.md](./REFACTORING.md) document for current priorities
2. Follow the architectural principles and coding standards
3. Add tests for new features or bug fixes
4. Submit pull requests with a clear description of changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Running the Application

The application is managed using PM2 for process management, monitoring, and automatic restarts. This provides a standardized and production-ready way to run the server.

### Development Environment

```bash
# Start the server in development mode
npm run start:dev

# View logs
npm run logs

# Monitor the application
npm run monitor

# Check status
npm run status

# Stop the application
npm run stop

# Restart the application
npm run restart

# Delete the application from PM2
npm run delete
```

### Production Environment

```bash
# Start the server in production mode
npm run start:prod

# The same commands for logs, monitoring, stopping, and restarting
# apply to production as well
```

### Health Checks

The application provides a health check endpoint at `/api/v1/health` that reports the status of critical dependencies (database, OpenAI). This endpoint is suitable for monitoring by external systems like Kubernetes, AWS ELB, or monitoring tools.

Example health check:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{
  "status": "success",
  "message": "Server is healthy",
  "timestamp": "2025-04-01T05:59:48.745Z",
  "uptime": 7.2824585,
  "dependencies": {
    "database": {
      "status": "healthy",
      "message": "Database connection is healthy",
      "responseTime": 511
    },
    "openai": {
      "status": "healthy",
      "message": "OpenAI API connection is healthy",
      "responseTime": 966
    }
  }
}
```

## GitHub Codespaces

This project is fully configured to work with GitHub Codespaces for easy development in the cloud.

### Using Codespaces

1. Click the green "Code" button on the GitHub repository
2. Select the "Codespaces" tab 
3. Click "Create codespace on main"

The environment will be automatically set up with all necessary dependencies and extensions.

See [.devcontainer/README.codespaces.md](.devcontainer/README.codespaces.md) for detailed instructions on using Codespaces with this project. 