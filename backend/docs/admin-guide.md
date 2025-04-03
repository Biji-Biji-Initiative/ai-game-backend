# Admin Guide

This document provides information on the administrative features of the application, including how to manage users, view analytics, and perform other administrative tasks.

## Overview

The admin system provides a secure way to perform operations that require access to data across users. These operations bypass Row Level Security (RLS) policies by using the Supabase service role.

## Security Considerations

- Admin access is restricted to users with the `admin` role in their JWT claims
- All admin operations are logged for auditing purposes
- The admin API endpoints are protected by middleware that checks for the admin role
- The service role credentials are only used on the server side and never exposed to clients

## Assigning Admin Role to Users

To assign the admin role to a user, you can use the stored procedure provided in the database:

```sql
SELECT add_admin_role('user-uuid-here');
```

This will add the `admin` role to the user's metadata in Supabase Auth.

To remove the admin role:

```sql
SELECT remove_admin_role('user-uuid-here');
```

## Admin API Endpoints

The following API endpoints are available for admin operations:

### User Management

- `GET /admin/users` - Get a list of all users in the system
- `PUT /admin/users/:userId` - Update a user's information
- `DELETE /admin/users/:userId` - Delete a user and all associated data

### Analytics

- `GET /admin/analytics` - Get system-wide analytics data including user counts, completed challenges, and personality profiles

### Evaluations

- `GET /admin/evaluations` - Get all evaluations across all users

## Row Level Security Bypass

The admin service uses the Supabase service role, which bypasses Row Level Security (RLS) policies. This allows administrators to perform operations that would otherwise be restricted by RLS.

When using the admin API, note that:

1. All operations are performed with the service role
2. RLS policies are completely bypassed
3. Operations can affect any user's data

## Database Functions

Several database functions have been created to support admin operations:

### `delete_user(user_id UUID)`

Deletes a user and all associated data, including:
- Conversation states
- Conversations
- Personality insights
- Personality profiles
- Evaluations
- Progress records
- Challenges

The function uses `SECURITY DEFINER` to ensure it runs with the privileges of the database owner, bypassing RLS policies.

### `add_admin_role(user_id UUID)`

Adds the admin role to a user's metadata in Supabase Auth.

### `remove_admin_role(user_id UUID)`

Removes the admin role from a user's metadata in Supabase Auth.

## Implementing Admin Features in the Frontend

When implementing admin features in the frontend, ensure that:

1. Admin pages are only accessible to users with the admin role
2. Admin operations are properly confirmed before execution
3. Error handling is in place for all admin operations

Here's an example of how to check for admin access in a React component:

```jsx
import { useAuth } from '../contexts/AuthContext';

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  if (!isAdmin) {
    return <AccessDenied message="Admin access required" />;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin content */}
    </div>
  );
}
```

## Auditing Admin Actions

All admin actions are logged with additional context for auditing purposes. The logs include:

- The user ID of the admin who performed the action
- The type of action performed
- Any relevant parameters or data
- Timestamp of the action

To view these logs, check the application logs with the context `AdminService` or `AdminController`.

## Best Practices

1. **Limit admin access**: Only assign the admin role to users who absolutely need it
2. **Perform admin operations carefully**: Since admin operations bypass RLS, they can have far-reaching effects
3. **Review logs regularly**: Keep an eye on admin actions to ensure they're appropriate
4. **Use the admin API responsibly**: Only use the admin API for legitimate administrative tasks
5. **Implement additional confirmation**: Add confirmation dialogs for destructive operations in the frontend

## Troubleshooting

If you encounter issues with admin operations:

1. **Check user role**: Ensure the user has the admin role in their JWT claims
2. **Verify JWT**: Make sure the JWT is valid and not expired
3. **Check logs**: Review application logs for specific error messages
4. **Database permissions**: Ensure the service role has the necessary permissions 