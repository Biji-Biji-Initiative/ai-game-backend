# @ai-fight-club/shared

This package contains only the minimal necessary types, interfaces, and utilities that need to be shared across multiple packages in the monorepo.

## Purpose

The `shared` package serves as the contract between packages. It contains:

- **API Contracts**: Request/response interfaces that define how clients interact with the API
- **Common Types**: Simple type definitions and enums for cross-package usage
- **Minimal Utilities**: Only utilities genuinely needed by multiple packages

## Important Notes

1. The API (`packages/api`) is the source of truth for domain logic
2. This package should NOT contain:
   - Rich domain models (these belong in the API)
   - Business logic (this belongs in the API)
   - Implementation details (these belong in their respective packages)

3. Only add to this package when you have a concrete need for sharing between packages

## Usage

```typescript
import { UserDTO, ApiResponse } from '@ai-fight-club/shared';
```

## Structure

```
src/
├── dto/       # Data Transfer Objects
├── utils/     # Shared utilities
└── types/     # Common types
```

## Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Architecture

This package provides utilities and types that are shared across all packages in the monorepo. It includes:

- **DTOs**: Data Transfer Objects for cross-package communication
- **Utils**: Shared utilities like logging, validation, and error handling
- **Types**: Common TypeScript types used across packages

## Dependencies

- TypeScript for type definitions
- Zod for schema validation 
