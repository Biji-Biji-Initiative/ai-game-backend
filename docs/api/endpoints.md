# API Endpoints Reference

This document provides a comprehensive reference of all API endpoints in the AI Gaming Backend. Each endpoint is documented with its purpose, request/response formats, authentication requirements, and example usage.

## Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
- [User Endpoints](#user-endpoints)
- [Personality Endpoints](#personality-endpoints)
- [Challenge Endpoints](#challenge-endpoints)
- [Focus Area Endpoints](#focus-area-endpoints)
- [Evaluation Endpoints](#evaluation-endpoints)
- [Progress Endpoints](#progress-endpoints)
- [System Endpoints](#system-endpoints)

## API URL Structure

All API endpoints follow this structure:

```
{base_url}/api/v{version_number}/{domain}/{resource}
```

For example:
- `https://api.aigaming.com/api/v1/user/profile`
- `https://api.aigaming.com/api/v1/challenge/list`

See the [API Versioning Strategy](./versioning-strategy.md) for more information on API versions.

## Common Response Structures

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:15:30Z"
  }
}
```

For error responses:

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "ERROR_CODE",
      "message": "Human-readable error message",
      "details": { ... }
    }
  ],
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:15:30Z"
  }
}
```

See [Common Patterns](./common-patterns.md) for more details on our API standards.

## Authentication Endpoints

### Register User

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Registers a new user in the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2023-04-03T10:15:30Z"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:15:30Z"
  }
}
```

**Status Codes:**
- `201 Created` - User successfully registered
- `400 Bad Request` - Invalid request format
- `409 Conflict` - Email already registered

### Login

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Authenticates a user and returns a session token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2023-04-04T10:15:30Z",
    "userId": "usr_123456"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:15:30Z"
  }
}
```

**Status Codes:**
- `200 OK` - Login successful
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Invalid credentials

See [Authentication](./authentication.md) for more details on authentication flows.

## User Endpoints

### Get User Profile

**Endpoint:** `GET /api/v1/user/profile`

**Description:** Retrieves the profile of the currently authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2023-03-15T14:30:45Z",
    "lastLoginAt": "2023-04-03T10:15:30Z"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:15:30Z"
  }
}
```

**Status Codes:**
- `200 OK` - Profile retrieved successfully
- `401 Unauthorized` - No valid authentication
- `404 Not Found` - User not found

### Update User Profile

**Endpoint:** `PATCH /api/v1/user/profile`

**Description:** Updates the profile of the currently authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Johnny Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "email": "user@example.com",
    "name": "Johnny Doe",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "updatedAt": "2023-04-03T10:20:15Z"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:20:15Z"
  }
}
```

**Status Codes:**
- `200 OK` - Profile updated successfully
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - No valid authentication
- `404 Not Found` - User not found

See [User API](./user-api.md) for more user-related endpoints.

## Challenge Endpoints

### List Challenges

**Endpoint:** `GET /api/v1/challenge/list`

**Description:** Lists all available challenges for the user.

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `available`)
- `categoryId` (optional): Filter by category ID
- `limit` (optional): Limit the number of results (default: 20)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "chl_123456",
        "title": "Beginner JavaScript Challenge",
        "description": "Test your JavaScript basics",
        "difficulty": "beginner",
        "category": "programming",
        "status": "available",
        "estimatedDuration": 15,
        "points": 100
      },
      {
        "id": "chl_234567",
        "title": "Advanced React Patterns",
        "description": "Master complex React patterns",
        "difficulty": "advanced",
        "category": "frontend",
        "status": "active",
        "estimatedDuration": 45,
        "points": 350
      }
    ],
    "total": 56,
    "limit": 20,
    "offset": 0
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:20:15Z"
  }
}
```

**Status Codes:**
- `200 OK` - Challenges retrieved successfully
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - No valid authentication

### Get Challenge Details

**Endpoint:** `GET /api/v1/challenge/{challengeId}`

**Description:** Retrieves detailed information about a specific challenge.

**Authentication:** Required

**Path Parameters:**
- `challengeId`: ID of the challenge to retrieve

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chl_123456",
    "title": "Beginner JavaScript Challenge",
    "description": "Test your JavaScript basics with this interactive challenge",
    "longDescription": "This challenge will test your understanding of JavaScript fundamentals including variables, functions, and basic DOM manipulation...",
    "difficulty": "beginner",
    "category": "programming",
    "status": "available",
    "estimatedDuration": 15,
    "points": 100,
    "prerequisites": [
      {
        "id": "chl_111111",
        "title": "Introduction to Programming"
      }
    ],
    "focusAreas": [
      {
        "id": "fa_222222",
        "name": "JavaScript Basics"
      },
      {
        "id": "fa_333333",
        "name": "Problem Solving"
      }
    ],
    "structure": {
      "sections": [
        {
          "id": "sec_123",
          "title": "Variables and Data Types",
          "order": 1,
          "tasks": 5
        },
        {
          "id": "sec_124",
          "title": "Functions",
          "order": 2,
          "tasks": 3
        }
      ],
      "totalTasks": 8
    },
    "createdAt": "2023-03-15T14:30:45Z",
    "updatedAt": "2023-03-20T09:15:30Z"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:20:15Z"
  }
}
```

**Status Codes:**
- `200 OK` - Challenge details retrieved successfully
- `401 Unauthorized` - No valid authentication
- `404 Not Found` - Challenge not found

See [Challenge API](./challenge-api.md) for more challenge-related endpoints.

## System Endpoints

### Health Check

**Endpoint:** `GET /api/v1/system/health`

**Description:** Checks the health status of the API server.

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.5.2",
    "uptime": 1534267,
    "timestamp": "2023-04-03T10:20:15Z"
  },
  "errors": null,
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2023-04-03T10:20:15Z"
  }
}
```

**Status Codes:**
- `200 OK` - System is healthy
- `500 Internal Server Error` - System is unhealthy

### API Documentation

**Endpoint:** `GET /api/v1/system/api-docs`

**Description:** Redirects to the Swagger documentation for the API.

**Authentication:** Not required

**Response:** Redirects to Swagger UI

**Status Codes:**
- `302 Found` - Redirect to Swagger UI

## Documentation & Resources

For detailed information about these endpoints:

- [API Overview](./README.md)
- [API Common Patterns](./common-patterns.md)
- [API Versioning Strategy](./versioning-strategy.md)
- [Authentication Documentation](./authentication.md)
- [Error Handling Documentation](../architecture/error-handling.md) 