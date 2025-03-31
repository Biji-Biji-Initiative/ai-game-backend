# AI Fight Club Monorepo

This monorepo contains all packages related to the AI Fight Club platform.

## Structure

```
packages/
  ├── api/               # Backend API service
  ├── database/          # Database models and migrations
  ├── shared/            # Shared utilities and types
  └── ui-tester/         # Frontend testing interface
```

## Technology Stack

- **Package Manager**: pnpm
- **Monorepo Management**: pnpm workspaces
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Supabase
- **API Client**: OpenAI SDK
- **Monitoring**: Sentry
- **Caching**: Redis

## Development Setup

### Prerequisites

- Node.js (v18+)
- pnpm (v10+)
- Docker (optional, for local database)

### Installation

```bash
# Install dependencies for all packages
pnpm install
```

### Running Services

```bash
# Start API server
pnpm dev:api

# Start UI tester
pnpm dev:ui-tester

# Run database migrations
pnpm db:migrate
```

## Monorepo Management

This project uses pnpm workspaces to manage dependencies across packages.

### Key Concepts

1. **Workspace References**: Package dependencies within the monorepo use `workspace:*` references
2. **Shared Dependencies**: Common dependencies are hoisted to the root
3. **Filtered Commands**: Run commands in specific packages with `pnpm --filter <package_name> <command>`

### Useful Commands

```bash
# Clean up node_modules in all packages
./cleanup-monorepo.sh

# Deep clean (including pnpm store)
./cleanup-monorepo.sh --deep

# Validate dependencies across packages
./validate-deps.sh

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint
```

## Adding New Dependencies

```bash
# Add dependency to a specific package
pnpm --filter @ai-fight-club/api add <package-name>

# Add dev dependency to a specific package
pnpm --filter @ai-fight-club/api add -D <package-name>

# Add dependency to all packages
pnpm add -w <package-name>
```

## Best Practices

1. **Dependency Management**:
   - Put shared dependencies in the root package.json
   - Keep package-specific dependencies in their package.json
   - Use `workspace:*` for internal package references

2. **Module Resolution**:
   - Use the importResolver.mjs for custom path mapping
   - Follow the `@/` convention for importing from src

3. **Consistency**:
   - Use the same Node.js version across all packages
   - Follow the same code style and linting rules
   - Share configurations via the root files

## Troubleshooting

If you encounter dependency issues:

1. Run `./cleanup-monorepo.sh` to clean up all node_modules
2. Run `./validate-deps.sh` to check for dependency issues
3. Ensure you're using the correct Node.js version 
