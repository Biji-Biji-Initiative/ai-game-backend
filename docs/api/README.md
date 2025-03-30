# API Documentation

This section provides comprehensive documentation for our API, organized by domain.

## Overview

Our API follows RESTful principles and is documented using the OpenAPI/Swagger specification. When the server is running, you can access the interactive Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

## Common Patterns

The API follows consistent patterns for authentication, responses, pagination, filtering, and error handling. These are documented in detail in the [Common Patterns](./common-patterns.md) guide.

## Authentication

All API endpoints require authentication through JWT tokens. See the [Authentication](./authentication.md) document for details on obtaining and using authentication tokens.

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

## API Versioning

The API follows semantic versioning. The current version is `v1`.

All endpoints are prefixed with `/api/v1/` followed by the domain and resource name, for example:

```
/api/v1/users
/api/v1/challenges
/api/v1/evaluations
```

## Contributing to API Documentation

### Adding Documentation to Endpoints

Each API endpoint should be documented using JSDoc comments with Swagger annotations. Example:

```javascript
/**
 * @swagger
 * /challenges:
 *   get:
 *     summary: List challenges
 *     description: Retrieves a paginated list of challenges
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: List of challenges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Challenge'
 */
```

### Validation and Generation

Use the following scripts to work with the API documentation:

```bash
# Validate the Swagger documentation
npm run swagger:validate

# Generate a static OpenAPI JSON file
npm run swagger:gen
```

### Best Practices

1. **Always document new endpoints**: All new API endpoints should include complete Swagger documentation
2. **Include examples**: Provide example values for request and response objects
3. **Use references**: Reuse common components with `$ref`
4. **Be specific with types**: Use appropriate types and formats (e.g., `uuid`, `date-time`)
5. **Document error responses**: Include documentation for error cases
6. **Keep descriptions clear**: Write clear, concise descriptions for endpoints and parameters

## Additional Resources

- [OpenAPI/Swagger Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [JSDoc Documentation](https://jsdoc.app/)
- [API Client Usage Guide](./common-patterns.md#using-the-api-client)

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

Contact the development team for usage instructions and SDK access. 