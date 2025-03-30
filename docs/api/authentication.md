# API Authentication

This document explains how to authenticate with the AI Gaming Backend API.

## Overview

The API uses [Supabase](https://supabase.io/) for authentication. All authenticated API requests must include a valid JSON Web Token (JWT) issued by Supabase.

## Authentication Endpoints

The API provides the following authentication endpoints:

### Signup

Register a new user account.

```
POST /api/auth/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "roles": ["user"],
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Confirmation email sent, please verify your email"
  }
}
```

### Login

Authenticate with email and password.

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "roles": ["user"],
      "profileComplete": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout

End the current user session.

```
POST /api/auth/logout
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Password Reset Request

Request a password reset email.

```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset email sent"
}
```

### Token Refresh

Refresh an expired access token using the refresh token.

```
POST /api/auth/refresh
```

The refresh token is stored in an HTTP-only cookie, so no request body is needed.

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Using Authentication Tokens

### Token Format

The API uses JWT tokens for authentication. When a user logs in, the server responds with an access token and sets a refresh token in an HTTP-only cookie.

### Making Authenticated Requests

Include the access token in the `Authorization` header of your requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example using fetch:

```javascript
const response = await fetch('https://api.example.com/api/users/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Token Expiration

Access tokens expire after a period (typically 1 hour). When an access token expires, you need to use the refresh token to get a new access token.

The refresh token is automatically sent in the cookie with your request to the refresh endpoint.

## Error Handling

### Common Authentication Errors

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "Email and password are required" | Login or signup attempt without credentials |
| 400 | "User with this email already exists" | Signup attempt with existing email |
| 401 | "Invalid login credentials" | Incorrect email or password |
| 401 | "Refresh token not found" | Missing refresh token cookie |
| 401 | "Invalid or expired refresh token" | The refresh token is invalid or expired |

### Example Error Response

```json
{
  "status": "error",
  "message": "Invalid login credentials"
}
```

## Security Best Practices

1. **Always use HTTPS** to ensure tokens are transmitted securely
2. **Store access tokens securely** in memory or secure storage
3. **Do not store access tokens** in local storage or as a long-lived variable
4. **Implement proper token refreshing** to maintain session validity
5. **Handle token expiration gracefully** in your client applications

## Implementation Notes

This API uses Supabase auth for authentication and maintains its own user database for additional user data. The authentication flow includes:

1. Authentication via Supabase
2. User data management in the application database
3. JWT tokens for API access
4. Refresh token rotation for security

For more details on Supabase authentication, refer to the [Supabase Auth documentation](https://supabase.com/docs/guides/auth). 