# API Common Patterns

This document describes the common patterns and conventions used throughout the API.

## Authentication

All API endpoints require authentication through JWT tokens. The tokens should be included in the `Authorization` header:

```
Authorization: Bearer <token>
```

See the [Authentication](./authentication.md) guide for detailed information on obtaining and using authentication tokens.

## Response Format

All API responses follow a consistent format:

### Success Responses

```json
{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  },
  "meta": {
    // Optional metadata like pagination info
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional error details
    }
  }
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_REQUEST` | 400 | The request is invalid or missing required parameters |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication is required for this endpoint |
| `INVALID_CREDENTIALS` | 401 | The provided credentials are invalid |
| `ACCESS_DENIED` | 403 | The authenticated user does not have permission to access this resource |
| `RESOURCE_NOT_FOUND` | 404 | The requested resource does not exist |
| `VALIDATION_ERROR` | 422 | The request contains invalid data that failed validation |
| `RATE_LIMIT_EXCEEDED` | 429 | The rate limit for this endpoint has been exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred on the server |

## Pagination

List endpoints support standard pagination parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number for pagination (default: 1) |
| `limit` | number | Number of items per page (default: 10, max: 100) |

Example Request:
```
GET /api/v1/challenges?page=2&limit=20
```

Example Response:
```json
{
  "success": true,
  "data": [
    // Array of challenge objects
  ],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 87,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

## Sorting

List endpoints support sorting by specific fields:

```
GET /api/v1/challenges?sort=createdAt:desc
```

Multiple sort fields can be specified by using comma separation:

```
GET /api/v1/challenges?sort=difficulty:asc,createdAt:desc
```

## Filtering

Collection endpoints support filtering by specific fields:

```
GET /api/v1/challenges?difficulty=advanced&type=coding
```

Some endpoints support a more complex filter syntax for advanced queries:

```
GET /api/v1/challenges?filter[difficulty]=advanced&filter[createdAt][gt]=2023-01-01
```

Supported operators:
- `eq`: Equal to (default if no operator specified)
- `ne`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to
- `in`: In an array of values
- `nin`: Not in an array of values
- `like`: Pattern matching with % as wildcard

Example with operators:
```
GET /api/v1/challenges?filter[difficulty][in]=beginner,intermediate&filter[title][like]=%AI%
```

## Field Selection

To reduce response size, you can request only specific fields:

```
GET /api/v1/challenges?fields=id,title,difficulty
```

## Including Related Resources

To include related resources in the response:

```
GET /api/v1/challenges?include=user,focusArea
```

This will include the referenced user and focusArea objects in the response.

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- 100 requests per minute per user
- 1000 requests per day per user

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1619285165
```

When a rate limit is exceeded, the API will respond with:
- Status code: `429 Too Many Requests`
- Error code: `RATE_LIMIT_EXCEEDED`

## CRUD Operations

The API follows RESTful conventions for CRUD operations:

| Operation | HTTP Method | Endpoint | Description |
|-----------|-------------|----------|-------------|
| Create | POST | `/resources` | Create a new resource |
| Read (List) | GET | `/resources` | List resources (with pagination) |
| Read (Single) | GET | `/resources/:id` | Get a specific resource by ID |
| Update | PUT | `/resources/:id` | Update all fields of a resource |
| Partial Update | PATCH | `/resources/:id` | Update specific fields of a resource |
| Delete | DELETE | `/resources/:id` | Delete a resource |

## Versioning

The API follows semantic versioning. All endpoints are prefixed with `/api/v1/` to indicate the current version.

Future breaking changes will result in a new version number:

```
/api/v2/resources
```

## Cross-Origin Resource Sharing (CORS)

The API supports CORS for frontend applications with the following configuration:

- Allowed origins: Configured per environment
- Allowed methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Content-Type, Authorization
- Max age: 86400 seconds (24 hours)

## Request Timestamps

To prevent replay attacks, some endpoints require an `X-Request-Timestamp` header:

```
X-Request-Timestamp: 2023-07-21T15:30:45Z
```

The server will reject requests with timestamps more than 5 minutes old.

## Request IDs

Each API request is assigned a unique request ID, returned in the `X-Request-ID` header. This ID can be used for debugging and support inquiries.

## Content Type

All API endpoints expect and return JSON data:

- Request Content-Type: `application/json`
- Response Content-Type: `application/json`

## API Health

The API health can be checked using the following endpoint:

```
GET /api/health
```

This endpoint does not require authentication and returns the current status of the API.

## Documentation

Interactive API documentation is available at:

```
/api-docs
```

The OpenAPI/Swagger specification is available at:

```
/api-docs/swagger.json
``` 