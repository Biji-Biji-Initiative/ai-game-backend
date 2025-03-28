# API Authentication

This document explains how to authenticate with the AI Fight Club API.

## Overview

The AI Fight Club API uses [Supabase](https://supabase.io/) for authentication. All API requests must include a valid JSON Web Token (JWT) issued by Supabase.

## Authentication Flow

The authentication flow involves these steps:

1. Register or sign in through Supabase Auth
2. Obtain a JWT token
3. Include the token in API requests
4. Handle token expiration and refresh

## Registration and Sign In

### Email/Password Authentication

```javascript
// Sign up with email and password
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});

// Sign in with email and password
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### OAuth Providers

```javascript
// Sign in with Google
const { user, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});

// Other supported providers: github, apple, twitter, discord
```

## Obtaining a JWT Token

When a user signs in successfully, Supabase Auth provides a JWT token:

```javascript
const { user, session, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});

// The JWT token is available in the session
const token = session.access_token;
```

## Using the JWT Token

Include the JWT token in the `Authorization` header of all API requests:

```javascript
// Making an authenticated request
const response = await fetch('https://api.aifightclub.com/api/v1/users/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

### Using the AI Fight Club SDK

If you're using the AI Fight Club SDK, you can set the token once:

```javascript
import { AIFightClubClient } from '@aifightclub/sdk';

// Initialize client with token
const client = new AIFightClubClient({
  apiKey: token
});

// Now all API calls will include the token
const userProfile = await client.users.getProfile();
```

## Token Lifecycle Management

### Token Expiration

Supabase JWT tokens expire after 60 minutes by default. Your application should handle token expiration gracefully.

### Token Refresh

Refresh the JWT token before it expires:

```javascript
// Refresh the session to get a new token
const { data, error } = await supabase.auth.refreshSession();
const newToken = data.session.access_token;
```

### Auto-Refresh with the SDK

The AI Fight Club SDK handles token refreshing automatically:

```javascript
import { AIFightClubClient } from '@aifightclub/sdk';

// Enable auto-refresh
const client = new AIFightClubClient({
  apiKey: initialToken,
  autoRefresh: true,
  refreshCallback: async () => {
    const { data } = await supabase.auth.refreshSession();
    return data.session.access_token;
  }
});
```

## User Information

Once authenticated, you can retrieve the current user's information:

```javascript
// Get the current user
const { data: { user } } = await supabase.auth.getUser();

// User object contains:
// - id: The user's UUID
// - email: The user's email address
// - user_metadata: Custom user metadata
```

## Security Considerations

### Token Storage

Store tokens securely:

- In browser environments, use `localStorage` or preferably `sessionStorage`
- For mobile apps, use secure storage options like Keychain (iOS) or KeyStore (Android)
- Never store tokens in plain JavaScript variables for long periods

### HTTPS

Always use HTTPS for all API requests to ensure tokens are transmitted securely.

### Logout

To properly log out a user, call the sign out method:

```javascript
await supabase.auth.signOut();
```

This invalidates the user's session and tokens.

## Troubleshooting

### Invalid Token

If you receive a `401 Unauthorized` response with an "Invalid token" message:

1. Check that the token is correctly formatted in the Authorization header
2. Verify that the token hasn't expired
3. Ensure the token was issued by the correct Supabase project

### Missing Token

If you receive a `401 Unauthorized` response with a "Missing authentication" message:

1. Verify that the Authorization header is included in the request
2. Check that the header format is `Bearer <token>`

### Insufficient Permissions

If you receive a `403 Forbidden` response:

1. The token is valid, but the user doesn't have permission for the requested resource
2. Check the user's role and permissions

## API Reference

For more details on Supabase authentication, refer to the [Supabase Auth documentation](https://supabase.com/docs/guides/auth). 