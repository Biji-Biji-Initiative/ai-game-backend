# Challenge API Reference

This document provides details for the Challenge API endpoints in the AI Gaming Backend.

## Overview

The Challenge API allows you to generate, retrieve, and submit responses to AI-powered coding and technical challenges. These endpoints enable the core learning and assessment functionality of the platform.

## Endpoints

### Generate Challenge

Generates a new challenge tailored to the user's focus area and difficulty preferences.

```
POST /api/challenges/generate
```

**Authentication Required:** Yes

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "focusArea": "security",
  "challengeType": "implementation",
  "formatType": "code",
  "difficulty": "intermediate"
}
```

**Request Fields:**
- `userEmail` (required): Email of the user requesting the challenge
- `focusArea`: Topic or area to focus the challenge on (e.g., "security", "performance", "algorithms")
- `challengeType`: Type of challenge to generate (options: "implementation", "debugging", "optimization", "design")
- `formatType`: Format of the challenge (options: "code", "text", "mixed")
- `difficulty`: Difficulty level (options: "beginner", "intermediate", "advanced", "expert")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "challenge-123",
    "title": "Implement JWT Authentication",
    "description": "Create a secure authentication system using JWT tokens...",
    "instructions": "Your task is to implement the following functions...",
    "difficulty": "intermediate",
    "focusArea": "security",
    "type": "implementation",
    "formatType": "code",
    "codeTemplate": "function authenticate(credentials) {\n  // TODO: Implement\n}",
    "createdAt": "2023-04-15T14:32:21.000Z",
    "userId": "user-123"
  }
}
```

### Submit Challenge Response

Submits a user's response to a specific challenge.

```
POST /api/challenges/:challengeId/submit
```

**Authentication Required:** Yes

**Path Parameters:**
- `challengeId`: ID of the challenge being responded to

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "response": "function authenticate(credentials) {\n  // Verify credentials\n  if (!credentials.username || !credentials.password) {\n    return null;\n  }\n  // Generate JWT token\n  return jwt.sign({ username: credentials.username }, SECRET_KEY, { expiresIn: '1h' });\n}",
  "metadata": {
    "language": "javascript",
    "timeTaken": 1200,
    "attemptCount": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "response-123",
    "challengeId": "challenge-123",
    "userEmail": "user@example.com",
    "responseText": "function authenticate(credentials) {...}",
    "evaluation": {
      "score": 85,
      "feedback": "Good implementation of JWT authentication. Consider adding more error handling for invalid tokens.",
      "strengthPoints": [
        "Properly validates input credentials",
        "Uses appropriate JWT signing method"
      ],
      "improvementPoints": [
        "Add error handling for invalid tokens",
        "Consider using environment variables for secret key"
      ]
    },
    "createdAt": "2023-04-15T15:45:33.000Z"
  }
}
```

### Get Challenge by ID

Retrieves a specific challenge by its ID.

```
GET /api/challenges/:challengeId
```

**Authentication Required:** Yes

**Path Parameters:**
- `challengeId`: ID of the challenge to retrieve

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "challenge-123",
    "title": "Implement JWT Authentication",
    "description": "Create a secure authentication system using JWT tokens...",
    "instructions": "Your task is to implement the following functions...",
    "difficulty": "intermediate",
    "focusArea": "security",
    "type": "implementation",
    "formatType": "code",
    "codeTemplate": "function authenticate(credentials) {\n  // TODO: Implement\n}",
    "createdAt": "2023-04-15T14:32:21.000Z",
    "userId": "user-123"
  }
}
```

### Get Challenge History

Retrieves the challenge history for the current user.

```
GET /api/challenges/history
```

**Authentication Required:** Yes

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `focusArea` (optional): Filter by focus area
- `status` (optional): Filter by status (e.g., "completed", "pending")

**Response:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "challenge-123",
        "title": "Implement JWT Authentication",
        "difficulty": "intermediate",
        "focusArea": "security",
        "createdAt": "2023-04-15T14:32:21.000Z",
        "status": "completed",
        "score": 85
      },
      {
        "id": "challenge-124",
        "title": "Fix SQL Injection Vulnerability",
        "difficulty": "intermediate",
        "focusArea": "security",
        "createdAt": "2023-04-14T10:15:33.000Z",
        "status": "completed",
        "score": 92
      }
    ],
    "pagination": {
      "total": 15,
      "pages": 2,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

### List Challenges

Retrieves a list of available challenges with optional filtering.

```
GET /api/challenges
```

**Authentication Required:** Yes

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `focusArea` (optional): Filter by focus area
- `difficulty` (optional): Filter by difficulty level
- `type` (optional): Filter by challenge type

**Response:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "challenge-123",
        "title": "Implement JWT Authentication",
        "difficulty": "intermediate",
        "focusArea": "security",
        "type": "implementation",
        "formatType": "code",
        "createdAt": "2023-04-15T14:32:21.000Z"
      },
      {
        "id": "challenge-124",
        "title": "Fix SQL Injection Vulnerability",
        "difficulty": "intermediate",
        "focusArea": "security",
        "type": "debugging",
        "formatType": "code",
        "createdAt": "2023-04-14T10:15:33.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "pages": 3,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

## Error Handling

### Common Challenge API Errors

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "User email is required" | Missing required email field |
| 400 | "Challenge ID and response are required" | Missing required fields for submission |
| 404 | "Challenge not found" | The requested challenge does not exist |
| 422 | "Invalid challenge parameters" | The provided challenge parameters are invalid |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "message": "Challenge not found",
    "code": "CHALLENGE_NOT_FOUND"
  }
}
```

## Challenge Types

The API supports the following challenge types:

| Type | Description |
|------|-------------|
| implementation | Implement a solution from scratch based on requirements |
| debugging | Find and fix bugs in existing code |
| optimization | Improve performance or efficiency of existing code |
| design | Create a system design or architecture |

## Format Types

The API supports the following format types:

| Format | Description |
|--------|-------------|
| code | Challenges requiring code as the response |
| text | Challenges requiring text explanations as the response |
| mixed | Challenges requiring both code and explanations | 