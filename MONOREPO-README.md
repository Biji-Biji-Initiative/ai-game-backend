# AI Fight Club Monorepo

A monorepo structure for the AI Fight Club API and related packages.

## Project Structure

```
ai-fight-club-monorepo/
├── packages/
│   ├── api/                     # Core API service (pure ESM JavaScript)
│   ├── database/                # Database layer & Supabase integration (ESM JavaScript)
│   ├── ui-tester/               # API testing UI (TypeScript)
│   └── shared/                  # Shared utilities and types (TypeScript)
├── docker/                      # Docker configurations for development
└── docs/                        # Project documentation
```

## Package Descriptions

### @ai-fight-club/api
- Core API service implementation (pure ESM JavaScript)
- REST endpoint controllers and adapters
- Full Domain-Driven Design implementation
  - Domain model, entities, aggregates, value objects
  - Application services and use cases
  - Domain services and business logic
  - Repository interfaces (Ports)
- Infrastructure implementations

### @ai-fight-club/database
- Supabase client configuration and initialization (ESM JavaScript)
- Database schema definitions
- Migration scripts and versioning
- Repository implementations (Adapters)
- Data mappers between database records and domain entities

### @ai-fight-club/ui-tester
- API testing user interface (TypeScript)
- Visualization of API responses
- Mock data generation
- Test case management

### @ai-fight-club/shared
- TypeScript interfaces for cross-package communication
- Data Transfer Objects (DTOs) for API requests/responses
- Shared validation schemas
- Utility functions used by multiple packages
- Error classes and handling
- Logging configuration

## Getting Started

### Prerequisites

- Node.js v22 or later
- npm v9.8.1 or later
- Docker and Docker Compose (for development environment)

### Installation

1. Clone the repository:
```sh
git clone https://github.com/yourusername/ai-fight-club-monorepo.git
cd ai-fight-club-monorepo
```

2. Install dependencies:
```sh
npm install
```

3. Build packages:
```sh
npm run build
```

### Development

1. Start the development server:
```sh
npm run dev
```

2. Using Docker:
```sh
docker-compose up
```

### Testing

```sh
npm test
```

### Linting

```sh
npm run lint
```

## ESM JavaScript Requirements

All JavaScript packages in this monorepo use ESM modules (`"type": "module"`). This requires special attention to imports:

```javascript
// CORRECT - With file extension
import { User } from './models/User.js';

// INCORRECT - Missing file extension
import { User } from './models/User';
```

## TypeScript with ESM

The shared package uses TypeScript with ESM output. Make sure to:

1. Use `NodeNext` for module and moduleResolution in tsconfig.json
2. Include `.js` extensions in import paths within TypeScript files

## Domain-Driven Design

The API package follows a DDD architecture:

- **Domain Layer**: Contains all domain models, entities, aggregates, value objects, domain events, domain services, and repository interfaces (Ports)
- **Application Layer**: Contains application services, use cases, commands, and queries
- **Infrastructure Layer**: Contains DI container, external services, and other technical infrastructure
- **Interface Layer**: Contains controllers, request/response models, and adapters

Cross-package communication uses DTOs and interfaces defined in the shared package, not actual domain models.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/ai-fight-club-monorepo](https://github.com/yourusername/ai-fight-club-monorepo) 
