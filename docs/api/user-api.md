# User API Reference

This document provides details for the User API endpoints in the AI Gaming Backend.

## Overview

The User API allows you to manage user profiles, preferences, and settings. All endpoints require authentication unless otherwise specified.

## Endpoints

### Get Current User

Retrieves the profile of the currently authenticated user.

```
GET /api/users/me
```

**Authentication Required:** Yes

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "professionalTitle": "Software Engineer",
      "roles": ["user"],
      "focusArea": "backend-development",
      "profileComplete": true
    }
  },
  "message": "User profile retrieved successfully"
}
```

### Update Current User

Updates the profile of the currently authenticated user.

```
PUT /api/users/me
```

**Authentication Required:** Yes

**Request Body:**
```json
{
  "fullName": "John Smith",
  "professionalTitle": "Senior Developer",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
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
      "fullName": "John Smith",
      "professionalTitle": "Senior Developer",
      "roles": ["user"],
      "focusArea": "backend-development",
      "preferences": {
        "theme": "dark",
        "notifications": true
      },
      "profileComplete": true
    }
  },
  "message": "User profile updated successfully"
}
```

### Set Focus Area

Set the primary focus area for the user.

```
POST /api/users/focus-area
```

**Authentication Required:** Yes

**Request Body:**
```json
{
  "focusArea": "backend-development"
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
      "fullName": "John Smith",
      "focusArea": "backend-development",
      "profileComplete": true
    }
  },
  "message": "Focus area updated successfully"
}
```

### Get User by ID (Admin Only)

Retrieves a user by their ID. This endpoint is restricted to administrators.

```
GET /api/users/:id
```

**Authentication Required:** Yes (Admin role)

**Path Parameters:**
- `id` - The ID of the user to retrieve

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Smith",
      "professionalTitle": "Senior Developer",
      "roles": ["user"],
      "focusArea": "backend-development",
      "createdAt": "2023-01-15T10:30:00Z",
      "lastLogin": "2023-04-20T15:45:22Z"
    }
  },
  "message": "User retrieved successfully"
}
```

### List All Users (Admin Only)

Retrieves a list of all users. This endpoint is restricted to administrators.

```
GET /api/users
```

**Authentication Required:** Yes (Admin role)

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "user-123",
        "email": "user1@example.com",
        "fullName": "John Smith",
        "roles": ["user"],
        "focusArea": "backend-development"
      },
      {
        "id": "user-124",
        "email": "user2@example.com",
        "fullName": "Jane Doe",
        "roles": ["user", "admin"],
        "focusArea": "frontend-development"
      }
    ]
  },
  "message": "Retrieved 2 users successfully"
}
```

### Create User (Test Only)

Creates a new user. This endpoint is for testing purposes only.

```
POST /api/users
```

**Authentication Required:** No

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-125",
      "email": "newuser@example.com",
      "fullName": "New User",
      "roles": ["user"]
    }
  },
  "message": "User created successfully"
}
```

## Error Handling

### Common User API Errors

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "Email is required" | Missing required email field |
| 400 | "Focus area is required" | Missing focus area in request |
| 404 | "User not found" | The requested user does not exist |
| 403 | "Unauthorized access" | The user does not have permission for this action |

### Example Error Response

```json
{
  "status": "error",
  "message": "User not found"
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