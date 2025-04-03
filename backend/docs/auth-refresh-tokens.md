# Authentication Refresh Token Implementation

This document describes the token refresh implementation in our application. The implementation provides secure, rotational refresh tokens with comprehensive tracking and management capabilities.

## Overview

Our authentication system uses JWT (JSON Web Tokens) for securing API access:

- **Access tokens** are short-lived (1 hour) and provide access to protected API endpoints
- **Refresh tokens** are long-lived (1 week) and are used to obtain new access tokens when they expire
- **Token rotation** is implemented for enhanced security, where each refresh token use generates a new refresh token

## Architecture

The refresh token implementation follows a layered architecture approach:

1. **Database Layer**: `refresh_tokens` table with RLS policies for secure storage
2. **Repository Layer**: `RefreshTokenRepository` for CRUD operations and token management
3. **Service Layer**: `AuthService` for business logic, token validation, and token rotation
4. **Controller Layer**: `AuthController` with HTTP endpoints for token operations

### Components

- **RefreshTokenRepository**: Manages the database operations for refresh tokens
- **AuthService**: Handles token validation, rotation, and security checks
- **AuthController**: Provides API endpoints for token operations

## Database Schema

The refresh tokens are stored in a dedicated `refresh_tokens` table:

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by TEXT,
    ip_address TEXT,
    user_agent TEXT
);
```

### Key Fields

- `id`: Unique identifier for the token record
- `user_id`: Reference to the user who owns the token
- `token`: The actual refresh token value (hashed)
- `created_at`: When the token was created
- `expires_at`: When the token expires
- `revoked`: Whether the token has been revoked
- `revoked_at`: When the token was revoked (if applicable)
- `replaced_by`: Reference to the token that replaced this one (for token rotation)
- `ip_address`: IP address where the token was issued (for tracking/security)
- `user_agent`: Browser/device information where the token was issued (for tracking/security)

### Database Indexes

```sql
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

### Row Level Security

```sql
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own refresh tokens
CREATE POLICY "Users can view their own refresh tokens" 
ON refresh_tokens 
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only service roles can insert, update, or delete tokens
CREATE POLICY "Service roles can manage refresh tokens" 
ON refresh_tokens 
FOR ALL
USING (auth.role() = 'service_role');
```

## Token Flow

### Login Flow

1. User logs in with username/password
2. Supabase Auth validates credentials and returns access and refresh tokens
3. The access token is returned to the client
4. The refresh token is:
   - Stored in the `refresh_tokens` table with client info (IP, user agent)
   - Set as an HTTP-only secure cookie for web clients
   - Returned in the response body for mobile/desktop clients

### Token Refresh Flow

1. When the access token expires, the client sends a request to `/auth/refresh`
2. The refresh token is extracted from cookies or request body
3. The token is validated against the database
4. If valid, Supabase Auth is used to generate a new session
5. The old refresh token is revoked and marked with the new token ID
6. The new refresh token is:
   - Stored in the database
   - Updated in the HTTP-only cookie (if applicable)
   - Returned to the client (if not using cookies)

### Logout Flow

1. User logs out
2. The refresh token is revoked in the database
3. The cookie is cleared (if applicable)
4. The Supabase session is invalidated

## Security Considerations

### Token Rotation

Each refresh token can only be used once. When a token is used to obtain a new access token, it is immediately revoked and replaced with a new refresh token. This mitigates the risk of token theft and replay attacks.

### Token Invalidation

Tokens can be invalidated in several ways:
- Explicit revocation during logout
- Automatic revocation after use (token rotation)
- Expiration (tokens have a 7-day lifetime)
- User-initiated session termination

### Client Information Tracking

Each token is associated with:
- The IP address where it was created/used
- The user agent (browser/device) information
- This enables detection of suspicious login attempts or token use

### Cleanup Process

A token cleanup process runs periodically to:
- Remove expired tokens
- Clean up revoked tokens older than 24 hours
- Prevent database bloat

## API Usage

### Login Endpoint

```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "email": "user@example.com",
      "fullName": "User Name",
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The refresh token is set as an HTTP-only cookie for web clients.

### Token Refresh Endpoint

```
POST /api/v1/auth/refresh
```

**Request:**
For clients using cookies, no request body is needed.

For clients not using cookies:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Only included if not using cookies
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

### Logout Endpoint

```
POST /api/v1/auth/logout
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

## Client Integration

### Web Clients

Web clients should rely on HTTP-only cookies for refresh tokens, which are automatically included in requests to the `/api/v1/auth/refresh` endpoint.

### Mobile/Desktop Clients

Mobile and desktop clients should:
1. Store the refresh token securely (e.g., in secure storage or keychain)
2. Include the refresh token in the request body when refreshing tokens
3. Update the stored refresh token when a new one is received

## Error Handling

The API returns standardized error responses:

```json
{
  "status": "error",
  "message": "Invalid or expired refresh token",
  "code": "AUTH_REFRESH_FAILED"
}
```

Common error codes:
- `AUTH_REFRESH_FAILED`: The refresh token is invalid, expired, or has been revoked
- `AUTH_REFRESH_MISSING`: No refresh token provided
- `AUTH_UNEXPECTED_ERROR`: An unexpected error occurred during token refresh

## Best Practices

1. Always use HTTPS for all API requests
2. For web applications, use HTTP-only, secure cookies with the SameSite attribute
3. For mobile/desktop applications, store tokens in secure storage
4. Implement automatic token refresh on 401 responses
5. Handle token refresh errors gracefully, redirecting users to login when needed 