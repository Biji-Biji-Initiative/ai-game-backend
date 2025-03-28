# Supabase Schema Setup and Maintenance

This document explains how to set up, maintain, and update your Supabase database schema to match your codebase.

## Initial Setup

We've created a clean, comprehensive schema definition based on your codebase. This ensures your Supabase database perfectly matches your application's requirements.

### Prerequisites

1. [Supabase CLI](https://supabase.com/docs/reference/cli) installed
2. Supabase project created
3. Database credentials in `.env` file

### Setup Steps

1. **Prepare your environment**

   Copy the example .env file and add your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add these required values:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase API key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `POSTGRES_PASSWORD` - Your Postgres database password

2. **Review the schema**

   The file `clean-schema-migration.sql` contains the complete database schema definition derived from your codebase. Review it to ensure it matches your requirements.

3. **Apply the schema**

   Run the setup script:

   ```bash
   node setup-supabase.js
   ```

   This will:
   - Link to your Supabase project
   - Apply the migration to create a fresh schema
   - Generate TypeScript types based on the schema

   ⚠️ **Warning**: This will reset your database. All existing data will be lost!

## Updating the Schema

When you need to update your schema:

1. **Update your codebase first**

   Make changes to your data models in your code.

2. **Create a migration file**

   Create a new migration file in the `migrations/` directory. Name it with a timestamp and description:

   ```bash
   touch migrations/$(date +%Y%m%d%H%M%S)_add_new_feature.sql
   ```

3. **Write your migration**

   Add SQL statements to the migration file to make the required changes.

4. **Apply the migration**

   ```bash
   npx supabase db push --db-url "postgres://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

5. **Update TypeScript types**

   ```bash
   npx supabase gen types typescript --linked > schema.types.ts
   ```

## Troubleshooting

### Can't connect to database

Make sure your `POSTGRES_PASSWORD` is correct in your `.env` file. This should be the database password for your Supabase project.

### Migration fails

If the migration fails, check the error message. Common issues include:
- Syntax errors in SQL
- Trying to create objects that already exist
- Trying to reference tables that don't exist

### Schema verification

To verify that your Supabase schema matches your codebase:

```bash
node direct-comparison.js
```

## Complete Reset

If you need to completely reset your database and start fresh:

1. Run the setup script:

   ```bash
   node setup-supabase.js
   ```

2. Alternatively, you can use the Supabase dashboard to reset your database.

## Schema Structure

The database schema includes:

- **Core Entities**:
  - `users` - User accounts
  - `challenges` - Challenge definitions and content
  - `evaluations` - Challenge evaluation results
  - `focus_areas` - Areas of focus for challenges
  - `difficulty_levels` - Challenge difficulty levels

- **Mappings and Relationships**:
  - `trait_challenge_mappings` - Maps personality traits to challenges
  - `focus_area_category_mappings` - Maps focus areas to evaluation categories
  - `focus_area_challenge_mappings` - Maps focus areas to challenge types

- **Metadata and Configuration**:
  - `challenge_types` - Types of challenges
  - `challenge_format_types` - Format types for challenges
  - `evaluation_categories` - Categories for evaluations
  - `prompts` - Prompt templates

- **User Data**:
  - `personality_profiles` - User personality data
  - `personality_insights` - Insights derived from personality
  - `user_progress` - User progress tracking
  - `user_journey_events` - User journey event tracking

- **Conversation Data**:
  - `conversations` - Conversation records
  - `conversation_states` - Conversation state tracking
  - `thread_activity_logs` - Activity logs for threads

## Best Practices

1. **Always make schema changes in code first**, then apply them to the database
2. **Use migrations** for all schema changes
3. **Keep schema and code in sync** by regularly comparing them
4. **Document schema changes** in your version control commits
5. **Test migrations** in a development environment before applying to production 