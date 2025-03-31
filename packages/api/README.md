# @ai-fight-club/api

Core API service for the AI Fight Club platform, implements the Domain-Driven Design architecture.

## Structure

```
src/
├── domain/         # Domain layer (entities, value objects, repository interfaces)
├── application/    # Application layer (services, use cases)
├── infrastructure/ # Infrastructure layer (external services, DI container)
└── interfaces/     # Interface layer (controllers, middleware)
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

## Architecture

This package follows Domain-Driven Design principles:

- **Domain Layer**: Contains all domain models, entities, aggregates, value objects, domain events, domain services, and repository interfaces (Ports)
- **Application Layer**: Contains application services, use cases, commands, and queries
- **Infrastructure Layer**: Contains DI container, external services, and other technical infrastructure
- **Interface Layer**: Contains controllers, request/response models, and adapters

## Dependencies

- Express for HTTP server
- Supabase for data storage via the database package
- OpenAI for AI capabilities 
