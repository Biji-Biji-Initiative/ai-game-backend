# Supabase Integration

## Overview

This project uses Supabase as its primary database and authentication service. We've implemented a flexible architecture that allows for both:

1. **Mock Supabase Client** - For local development, testing, and CI environments
2. **Real Supabase Client** - For true integration tests and production

## Connection Configuration

Supabase connections can be configured through environment variables:

```
# Supabase URL
SUPABASE_URL=https://your-project-url.supabase.co

# Authentication keys
SUPABASE_ANON_KEY=your-anon-key            # Limited permissions
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # Elevated permissions

# Testing configuration
USE_REAL_SUPABASE=true|false               # Force real or mock implementation
```

## Client Factory

We use a client factory pattern to manage Supabase connections:

```javascript
import { getSupabaseClient } from "./util/supabaseClientFactory.js";

// Get a client with default configuration
const supabaseClient = getSupabaseClient();

// Force mock implementation
const mockClient = getSupabaseClient({ useMock: true });

// Force real implementation with service role key
const adminClient = getSupabaseClient({ 
  useMock: false, 
  useServiceKey: true 
});
```

## Integration Testing

For integration tests, we provide two approaches:

### 1. Mock Implementation

For fast, reliable testing without external dependencies:

```javascript
// Force mock implementation
USE_REAL_SUPABASE=false npx mocha tests/integration/workflows/**/*.test.js
```

The mock client:
- Uses an in-memory database for storage
- Mimics the real Supabase API
- Doesn't require external credentials
- Provides predictable test behavior

### 2. True Integration Tests

For verifying actual database interactions:

```javascript
// Use real Supabase
USE_REAL_SUPABASE=true npx mocha tests/integration/workflows/**/*.integration.test.js
```

These tests:
- Connect to the actual Supabase project
- Test row-level security and permissions
- Verify schema compatibility
- Require proper credentials

## Database Structure

Current tables include:

- **users** - User accounts and profiles
- **challenges** - Challenge definitions
- **evaluations** - Challenge evaluation records

## Row-Level Security (RLS)

Supabase uses Row-Level Security (RLS) policies to control access to data:

- **Anon Key** - Limited read access to public data
- **Service Role Key** - Bypasses RLS for administrative operations

For true integration tests requiring write operations, you must use the service role key.

## Best Practices

1. Always clean up test data after tests run
2. Use unique identifiers for test data to avoid conflicts
3. Avoid hard dependencies on Supabase-specific features when possible
4. Keep mock implementations in sync with actual API changes 