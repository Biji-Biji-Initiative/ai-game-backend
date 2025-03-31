# @ai-fight-club/database

Database layer and Supabase integration for the AI Fight Club platform.

## Structure

```
src/
├── client/        # Supabase client initialization
├── repositories/  # Repository implementations (adapters)
└── mappers/       # Data mappers between DB and domain models
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run migrations
npm run migrate

# Seed database
npm run seed
```

## Architecture

This package provides repository implementations (adapters) for the repository interfaces (ports) defined in the API package. It follows the Repository Pattern and Adapter Pattern to provide a clean separation between domain logic and data access.

## Dependencies

- Supabase for data storage
- Domain models imported from the API package

# Database Schema Management

This directory contains the Supabase database schema management files for the application.

## Directory Structure

- `migrations/`: Contains incremental SQL migration files in timestamp order
  - `0000_initial_schema.sql`: The base schema with all table definitions
  - `20230401000000_evaluation_categories.sql`: Adds evaluation categories data
  - `20230402000000_trait_focus_mappings.sql`: Adds trait-focus mapping data
  - `20230403000000_update_focus_areas.sql`: Updates focus areas schema
  - `20230404000000_add_conversation_states_indexes.sql`: Adds additional indexes
- `seed.sql`: Contains test data for local development
- `config.toml`: Supabase configuration file

## Migration Workflow

### Local Development

1. **Initial Setup**:
   ```bash
   supabase start
   ```
   This will apply all migrations and seed data.

2. **Reset Database**:
   ```bash
   supabase db reset
   ```
   This wipes the database and re-applies all migrations + seed data.

### Making Schema Changes

1. **Create a New Migration**:
   ```bash
   supabase migration new my_change_description
   ```
   This creates a new timestamped migration file in the `migrations` directory.

2. **Add Your SQL Changes**:
   Edit the newly created file to add your schema changes. Only include the incremental changes, not the entire schema.

3. **Alternative: Generate a Diff**:
   - Make changes to your local database using SQL tools or Supabase Studio
   - Generate a diff:
     ```bash
     supabase db diff > migrations/YYYYMMDDHHMMSS_my_change_description.sql
     ```
   - Review the generated SQL diff and edit if necessary

4. **Test Your Migration**:
   ```bash
   supabase db reset
   ```

### Remote Deployment

1. **Link to Your Project**:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

2. **Push Migrations**:
   ```bash
   supabase db push
   ```

## TypeScript Types

You can generate TypeScript types based on your schema with:

```bash
supabase gen types typescript --local > ../schema.types.ts
```

## Best Practices

1. **Incremental Changes**: Each migration should only contain the changes needed, not the entire schema.
2. **Use Idempotent SQL**: Prefer `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT` to avoid errors if statements are run multiple times.
3. **Test Migrations**: Always test migrations locally before pushing to production.
4. **Version Control**: Commit all migration files to version control.
5. **Never Edit Existing Migrations**: Once a migration has been applied and committed, create a new migration file for further changes.
6. **Comments**: Add descriptive comments to your migrations explaining what they do and why.
7. **RLS Policies**: Remember to set up Row Level Security policies for tables containing sensitive data.

## Common Commands

- Start Supabase: `supabase start`
- Stop Supabase: `supabase stop`
- Reset Database: `supabase db reset`
- Create Migration: `supabase migration new <name>`
- Create Diff Migration: `supabase db diff > migrations/<timestamp>_<name>.sql`
- Push Migrations: `supabase db push`
- Generate Types: `supabase gen types typescript --local > ../schema.types.ts` 
