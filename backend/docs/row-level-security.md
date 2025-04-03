# Supabase Row Level Security (RLS) Implementation

This document outlines the Row Level Security (RLS) policies that have been implemented in our Supabase database to ensure proper data protection and access control.

## Overview

Row Level Security (RLS) is a security feature in PostgreSQL/Supabase that allows us to restrict which rows a user can access in a database table. RLS policies are defined at the database level and are enforced regardless of how the data is accessed, providing a robust security layer.

## RLS Policies Implementation

We have implemented RLS policies for all our database tables to ensure that:

1. Users can only access their own data
2. Service roles can access data necessary for backend operations
3. Reference/lookup data is accessible to all authenticated users

## Policy Structure

For each table, we have defined specific policies based on its purpose and access requirements:

### User Data Tables

Tables like `users`, `challenges`, `evaluations`, `personality_profiles`, etc. have policies that:

- Allow users to SELECT only their own data
- Allow users to INSERT/UPDATE only their own data
- Allow service roles to access all data for backend operations

### Reference/Lookup Tables

Tables like `challenge_types`, `focus_areas`, `difficulty_levels`, etc. have policies that:

- Allow all authenticated users to SELECT data
- Allow only service roles to modify data

## Example Policy Implementation

Here's an example of the policies for the `challenges` table:

```sql
-- Users can view only their own challenges
CREATE POLICY "Users can view own challenges" ON challenges 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Users can create challenges for themselves only
CREATE POLICY "Users can create own challenges" ON challenges 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Users can update only their own challenges
CREATE POLICY "Users can update own challenges" ON challenges 
  FOR UPDATE 
  USING (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  )) 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Admins can access all challenges
CREATE POLICY "Admin can access all challenges" ON challenges 
  FOR ALL 
  USING (auth.role() = 'service_role');
```

## Service Role Usage

The service role key has full access to the database, bypassing RLS. Therefore:

1. **Backend server operations** that need to access data across users should use the service role
2. **Client-side operations** should NEVER use the service role and should rely on the anon/authenticated role
3. Service role usage should be **explicitly logged** for audit purposes

### When to Use Service Role

- Batch operations that need to access multiple users' data
- Admin operations that need to access or modify data across users
- Backend processes that aggregate data across users

### When NOT to Use Service Role

- Regular API endpoints serving individual user requests
- Any client-side code
- Any operation that can be performed with the user's own role

## Development Guidelines

When developing features that access the database:

1. **Test with RLS enabled**: Always test with RLS enabled to ensure your code respects the security boundaries.
2. **Avoid using the service role**: Unless absolutely necessary, avoid using the service role.
3. **Document service role usage**: If you must use the service role, document why it's necessary.
4. **Pass user context**: Always ensure the user context is available when making database queries.

## Supabase Client Configuration

Here's how to configure the Supabase client with the appropriate role:

```javascript
// For authenticated user operations (respects RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// For backend service operations (bypasses RLS)
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

## Security Considerations

1. **Never expose the service role key**: The service role key should never be exposed to clients or included in client-side code.
2. **Validate user identity**: Always validate the user's identity before performing operations on their behalf.
3. **Audit service role usage**: Regularly audit use of the service role to ensure it's only being used when necessary.
4. **Test RLS policies**: Regularly test RLS policies to ensure they're working as expected.

## Troubleshooting

If you encounter issues with RLS:

1. **Check the user context**: Ensure the user is properly authenticated and the context is correctly set.
2. **Verify the policy**: Check that the RLS policy is correctly defined for the operation you're trying to perform.
3. **Use the service role sparingly**: If you need to troubleshoot, you can temporarily use the service role, but revert to the user role once the issue is identified.

## Migration Notes

The RLS policies have been implemented in the migration file `20240603000000_add_rls_policies.sql`. This migration adds comprehensive RLS policies to all tables in the database.

If you need to modify the RLS policies, create a new migration file rather than modifying the existing one. 