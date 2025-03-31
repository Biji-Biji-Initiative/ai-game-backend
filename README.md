# AI Fight Club - Monorepo

This monorepo contains all packages for the AI Fight Club application.

## Architecture

The monorepo is organized into the following packages:

- **packages/api**: Backend API service built with DDD principles
  - Contains the core business logic
  - Main source of truth for domain models and business rules
  - Uses ES Modules and JavaScript

- **packages/database**: Database schema, migrations, and access layer
  - Handles database connections and operations
  - Contains migration scripts and seed data
  - Consumed by the API package

- **packages/shared**: Minimal shared types and interfaces
  - Contains ONLY types and interfaces needed by multiple packages
  - Defines the API contracts between frontend and backend
  - Keeps shared types minimal and simple (no rich domain models)

- **packages/ui-tester**: Simple React testing interface
  - Allows testing API endpoints through a UI
  - Demonstrates how a full frontend would interact with the API

## Dependency Structure

```
ui-tester ----> API
    |           ^
    |           |
    v           |
  shared <------+
    ^
    |
database
```

## Development

To run the entire application:

1. Start the database
2. Build the shared package
3. Start the API
4. Start the UI tester

```bash
# Install all dependencies
npm install

# Build shared package
cd packages/shared && npm run build

# Start API in development mode
cd packages/api && npm run dev

# In another terminal, start UI tester
cd packages/ui-tester && npm run dev
``` 
