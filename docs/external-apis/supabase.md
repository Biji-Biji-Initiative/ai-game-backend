# Supabase Integration

This document outlines how our application integrates with Supabase for database storage, authentication, and other backend services.

## What is Supabase?

Supabase is an open source Firebase alternative that provides a PostgreSQL database, authentication, instant APIs, and realtime subscriptions.

> **Note:** For comprehensive documentation on Supabase, refer to [Supabase's official documentation](https://supabase.com/docs).

## Our Implementation

Our application uses Supabase as the primary data store and authentication provider. We've implemented this through:

1. **SupabaseClient** (`src/lib/supabase/SupabaseClient.js`) - A wrapper around the Supabase client
2. **Repository Implementations** (`src/core/*/repositories/*.js`) - Domain-specific repositories that use Supabase for persistence
3. **Authentication Service** (`src/core/infra/auth/SupabaseAuthService.js`) - Handles user authentication through Supabase

## Database Schema

Our Supabase database includes the following key tables:

1. `users` - User profiles and preferences
2. `challenges` - Challenge definitions and metadata
3. `challenge_responses` - User responses to challenges
4. `evaluations` - AI evaluations of user responses
5. `focus_areas` - Available focus areas for challenges
6. `conversation_states` - States for OpenAI conversations

Each table follows our domain model structure, with appropriate relationships defined between them.

## Key Usage Patterns

### Data Access

Domain repositories use Supabase queries:

```javascript
// Example of fetching a challenge
const { data, error } = await this.supabase
  .from('challenges')
  .select('*')
  .eq('id', challengeId)
  .single();
  
if (error) throw new RepositoryError(`Failed to fetch challenge: ${error.message}`);
return new Challenge(data);
```

### Authentication

The authentication flow uses Supabase's auth services:

```javascript
// Example of email/password authentication
const { data, error } = await this.supabase.auth.signInWithPassword({
  email,
  password
});

if (error) throw new AuthenticationError(error.message);
return data.session;
```

### Transactions

For operations that require transactions:

```javascript
// Example of a transaction
const { error } = await this.supabase.rpc('create_challenge_with_questions', {
  challenge_data: challengeData,
  questions_data: questionsData
});
```

## Configuration

Supabase integration is configured through environment variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Error Handling

Our implementation includes custom error handling for common Supabase issues:

1. Connection errors
2. Authentication failures
3. Foreign key constraint violations
4. Unique constraint violations

See `src/lib/supabase/SupabaseErrorHandler.js` for details.

## Local Development

For local development, you can use:

1. Supabase local development with Docker
2. A development/test Supabase project with sample data

## Migrations

Database schema changes are managed through:

1. Migration scripts in the `migrations/` directory
2. The Supabase CLI for applying migrations

See [DEPLOYMENT.md](/DEPLOYMENT.md) for more information on running migrations.

## Testing

For testing Supabase integration:

1. Unit tests use a mock Supabase client
2. Integration tests connect to a test Supabase project
3. Test utilities handle setting up and cleaning up test data

See [TESTING.md](/TESTING.md) for more details on testing practices. 