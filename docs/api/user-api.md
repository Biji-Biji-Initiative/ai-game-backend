# User Domain API

This document outlines the User domain API endpoints, request/response formats, and authentication requirements.

## Domain Responsibilities

The User domain is responsible for:
- User identity and authentication
- User profile management
- Focus area selection
- User preferences and settings

## Authentication

All endpoints require authentication using a Bearer token:

```
Authorization: Bearer <token>
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "status": "error",
  "error": {
    "message": "Error message",
    "domain": "user",
    "errorType": "ERROR_TYPE",
    "requestId": "request-id"
  }
}
```

## Endpoints

### Get Current User

Get the currently authenticated user's profile.

**URL:** `/api/users/me`

**Method:** `GET`

**Response:**

```json
{
  "status": "success",
  "message": "User profile retrieved successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "displayName": "Display Name",
      "bio": "User bio",
      "preferences": {
        "theme": "dark",
        "emailNotifications": true
      },
      "focusArea": "productivity",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
}
```

### Update Current User

Update the currently authenticated user's profile.

**URL:** `/api/users/me`

**Method:** `PUT`

**Body:**

```json
{
  "name": "Updated Name",
  "displayName": "New Display Name",
  "bio": "Updated bio",
  "preferences": {
    "theme": "dark",
    "emailNotifications": false
  }
}
```

**Response:**

```json
{
  "status": "success",
  "message": "User profile updated successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "Updated Name",
      "displayName": "New Display Name",
      "bio": "Updated bio",
      "preferences": {
        "theme": "dark",
        "emailNotifications": false
      },
      "focusArea": "productivity",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
}
```

### Set Focus Area

Set the focus area for the current user.

**URL:** `/api/users/me/focus-area`

**Method:** `PUT`

**Body:**

```json
{
  "focusArea": "productivity"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Focus area updated successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "focusArea": "productivity",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
}
```

### Get User By ID (Admin only)

Get a user by their ID. Requires admin privileges.

**URL:** `/api/users/:id`

**Method:** `GET`

**Parameters:**
- `id`: User ID (UUID)

**Response:**

```json
{
  "status": "success",
  "message": "User retrieved successfully",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "displayName": "Display Name",
      "bio": "User bio",
      "preferences": {
        "theme": "dark",
        "emailNotifications": true
      },
      "focusArea": "productivity",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  }
}
```

### List All Users (Admin only)

List all users. Requires admin privileges.

**URL:** `/api/users`

**Method:** `GET`

**Response:**

```json
{
  "status": "success",
  "message": "Retrieved 2 users successfully",
  "statusCode": 200,
  "data": {
    "users": [
      {
        "id": "user-id-1",
        "email": "user1@example.com",
        "name": "User One",
        "createdAt": "2023-01-01T00:00:00Z"
      },
      {
        "id": "user-id-2",
        "email": "user2@example.com",
        "name": "User Two",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Cross-Domain Interactions

### Events Published
- `USER_CREATED`: Published when a new user is created
- `USER_DELETED`: Published when a user is deleted
- `USER_FOCUS_AREA_CHANGED`: Published when a user updates their focus area

### Events Consumed
- `PERSONALITY_TRAITS_UPDATED`: Consumed to update user recommendations
- `AI_ATTITUDES_UPDATED`: Consumed to update user AI interaction preferences 