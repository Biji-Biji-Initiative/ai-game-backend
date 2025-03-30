# Setup Scripts

This directory contains scripts for setting up the development environment, managing the database, and handling dependencies.

## Available Scripts

### Environment Setup

- `setup-env.js` - Sets up environment variables and verifies connections
- `run-migrations.js` - Runs database migrations
- `seed-data.js` - Contains seed data for the database
- `install-deps.sh` - Installs necessary CLI dependencies

### Database Management

- `seed-db.js` - Seeds the database with initial data

## Usage

### Install Dependencies

```bash
# Install required CLI tools and dependencies
chmod +x scripts/setup/install-deps.sh
./scripts/setup/install-deps.sh
```

### Setup Environment

```bash
# Set up and verify environment variables
node scripts/setup/setup-env.js
```

### Database Management

```bash
# Run migrations
node scripts/setup/run-migrations.js

# Seed the database
node scripts/setup/seed-db.js
```

## Common Tasks

These scripts can be run through npm scripts for convenience:

```bash
# Setup environment
npm run setup:env

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## Best Practices

1. Run `setup-env.js` first to ensure your environment is properly configured
2. Run `install-deps.sh` to make sure all required tools are installed
3. Use the npm scripts when possible for standardized execution
4. Always backup your database before running migrations in production

## Environment Setup Flow

The recommended sequence for setting up a new development environment:

1. **Set up environment files**:
   ```bash
   npm run setup:env
   ```

2. **Apply database migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Seed the database**:
   ```bash
   npm run db:seed
   ```

4. **Verify the setup**:
   ```bash
   npm test
   ```

## Migration Strategy

We use SQL migration files in the `/migrations` directory for database schema changes. Migrations are applied in alphabetical order, so prefix them with numbers (e.g., `001_initial_schema.sql`).

The `run-migrations.js` script is used to apply these migrations. Alternatively, you can use the Supabase CLI directly with `npm run db:push`.

## Adding New Setup Scripts

When adding new setup scripts to this directory:

1. Create your script with a descriptive name that reflects its purpose
2. Make it executable (`chmod +x scripts/setup/your-script.js`)
3. Start with proper Node.js shebang and strict mode:
   ```javascript
   #!/usr/bin/env node
   'use strict';
   ```
4. Use chalk for colored output for better readability
5. Include proper error handling for setup failures
6. Add it to this README
7. Add a corresponding npm script in package.json if commonly used 