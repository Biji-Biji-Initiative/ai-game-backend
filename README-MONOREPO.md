# AI Fight Club Monorepo

A monorepo structure for the AI Fight Club platform, implementing Domain-Driven Design principles.

## Structure

```
ai-fight-club-monorepo/
├── packages/
│   ├── api/                     # Core API service (ESM JavaScript)
│   │   └── src/
│   │       ├── domain/          # Domain layer - entities, value objects, ports
│   │       ├── application/     # Application layer - services, use cases
│   │       ├── infrastructure/  # Infrastructure layer - external integrations
│   │       └── interfaces/      # Interface layer - controllers, routes
│   │
│   ├── database/                # Database layer & Supabase integration (ESM JavaScript)
│   │   └── src/
│   │       ├── client/          # Supabase client
│   │       ├── repositories/    # Repository implementations (adapters)
│   │       └── mappers/         # Data mappers
│   │
│   ├── shared/                  # Shared utilities and types (TypeScript)
│   │   └── src/
│   │       ├── dto/             # Data Transfer Objects
│   │       ├── utils/           # Shared utilities
│   │       └── types/           # Common types
│   │
│   └── ui-tester/               # API testing UI (TypeScript/React)
│       └── src/                 # UI source code
│
├── docker/                      # Docker configurations
│   └── dev/                     # Development Docker configurations
│
└── docs/                        # Project documentation
```

## Getting Started

### Prerequisites

- Node.js v22.11.0 or higher
- npm v9.8.1 or higher
- Docker and Docker Compose (for development with containers)

### Installation

1. Clone the repository:
```sh
git clone <repository-url>
cd ai-fight-club-monorepo
```

2. Install dependencies:
```sh
npm install
```

3. Build shared package:
```sh
npm run build:shared
```

4. Start development services:
```sh
npm run dev
```

### Development Scripts

- `npm run dev` - Run all packages in development mode
- `npm run dev:api` - Run API only
- `npm run dev:ui` - Run UI tester only
- `npm run build` - Build all packages
- `npm run test` - Test all packages
- `npm run lint` - Lint all packages
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database with test data

### Docker Development

```sh
docker-compose up
```

## Architecture

This project follows Domain-Driven Design principles with a clear separation of concerns. The key architectural patterns used include:

- **Domain-Driven Design**: Ensures business logic is at the heart of the application
- **Hexagonal Architecture**: Allows the application to be driven by the domain, with adapters for external concerns
- **Repository Pattern**: Abstracts data access behind interfaces defined in the domain
- **CQRS Pattern**: Separates read and write operations for more complex domains

## ESM JavaScript Requirements

All JavaScript packages use ESM modules (`"type": "module"`). This requires:

```javascript
// Correct - With file extension
import { someFunction } from './module.js';

// Incorrect - Missing file extension
import { someFunction } from './module';
```

## TypeScript with ESM

The shared package uses TypeScript with ESM output. When importing:

```typescript
// Import from shared package
import { UserDTO } from '@ai-fight-club/shared';

// Import from local TypeScript module
import { Something } from './local-module.js';
```

## Linting and Formatting

- ESLint for linting
- Prettier for code formatting
- Husky for git hooks
- Commitlint for conventional commits

## Testing

- Jest for unit and integration tests
- Supertest for API testing

## License

[MIT](LICENSE) 
