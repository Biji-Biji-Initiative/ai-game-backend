# API Documentation

This section provides comprehensive documentation for the AI Fight Club API, organized by domain.

## Authentication

All API endpoints require authentication through Supabase JWT tokens. See the [Authentication](./authentication.md) document for details on obtaining and using authentication tokens.

## API Structure

The API is organized by domains, following our Domain-Driven Design approach:

### User Domain

- [User API](./user-api.md): User profiles, preferences, and authentication
- [Personality API](./personality-api.md): AI persona customization

### Challenge Domain

- [Challenge API](./challenge-api.md): Challenge creation, management, and responses
- [Focus Area API](./focus-area-api.md): Learning topics and skill areas

### Evaluation Domain

- [Evaluation API](./evaluation-api.md): Assessment of user responses and feedback

### Progress Domain

- [Progress API](./progress-api.md): Tracking user advancement and learning journey
- [Adaptive API](./adaptive-api.md): Adaptive learning paths and recommendations

## API Versioning

The API follows semantic versioning. The current version is `v1`.

All endpoints should be prefixed with `/api/v1/` followed by the domain and resource name, for example:

```
/api/v1/users
/api/v1/challenges
/api/v1/evaluations
```

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

## Common Query Parameters

All list endpoints support the following query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number for pagination (default: 1) |
| `limit` | number | Number of items per page (default: 10, max: 100) |
| `sort` | string | Field to sort by (e.g., `createdAt:desc`) |
| `fields` | string | Comma-separated list of fields to include |
| `include` | string | Comma-separated list of related resources to include |

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

## Cross-Origin Resource Sharing (CORS)

The API supports CORS for frontend applications with the following configuration:

- Allowed origins: Configured per environment
- Allowed methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Content-Type, Authorization
- Max age: 86400 seconds (24 hours)

## API SDKs

Official client libraries are available for:

- JavaScript/TypeScript
- Python
- Dart/Flutter

See the [Client SDKs](../external-apis/client-sdks.md) documentation for usage instructions. 