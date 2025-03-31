# API Documentation

This document provides information about the AI Fight Club API documentation and how to work with it.

## Swagger/OpenAPI Documentation

Our API is documented using the OpenAPI 3.0 standard (formerly known as Swagger). The documentation is generated from JSDoc comments in the codebase and configured in `src/config/swagger.js`.

### Accessing the Documentation

When the server is running, you can access the Swagger UI at:

```
http://localhost:3000/api-docs
```

This interactive documentation allows you to:

- Browse all available endpoints
- See request and response schemas
- Test API calls directly from the browser
- View authentication requirements
- Explore models and data structures

### Authentication

Most API endpoints require authentication using JWT tokens. To authenticate in the Swagger UI:

1. Create a user account or login via the `/auth/login` endpoint
2. Copy the token from the response
3. Click the "Authorize" button at the top of the Swagger UI
4. Enter your token in the format: `Bearer <your-token-here>`
5. Click "Authorize" to apply the token to all requests

### Pagination

List endpoints support standard pagination parameters:

- `limit`: Maximum number of items to return (default: 20, max: 100)
- `offset`: Number of items to skip (for pagination)
- `sort`: Field to sort by (prefix with `-` for descending order)

Example: `GET /challenges?limit=10&offset=20&sort=-createdAt`

### Filtering

Many collection endpoints support filtering by specific fields:

- Simple filters: Use query parameters matching field names (e.g., `?difficulty=advanced`)
- Complex filters: Some endpoints support a `filter` parameter in the format `field:operator:value`

Example: `GET /challenges?difficulty=advanced&type=coding`

### Rate Limiting

API calls are subject to rate limiting to ensure fair usage:

- Standard rate limit: 100 requests per minute per API key
- Authentication endpoints: 20 requests per minute per IP address

When a rate limit is exceeded, the API will respond with:

- Status code: `429 Too Many Requests`
- Headers:
  - `X-RateLimit-Limit`: Request limit per hour
  - `X-RateLimit-Remaining`: Remaining requests in the current period
  - `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

### Error Handling

The API uses standard HTTP status codes and a consistent error response format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    }
  ]
}
```

Common error status codes:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authentication valid but insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors in request data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

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

### Documenting Models

Data models should be documented in schema files using JSDoc comments:

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     Challenge:
 *       type: object
 *       required:
 *         - id
 *         - title
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
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

The validation script checks for common issues in the documentation, such as:
- Missing response definitions
- Missing request bodies for POST/PUT operations
- Operations without tags
- References that don't resolve correctly

### Best Practices

1. **Always document new endpoints**: All new API endpoints should include complete Swagger documentation
2. **Include examples**: Provide example values for request and response objects
3. **Use references**: Reuse common components with `$ref`
4. **Be specific with types**: Use appropriate types and formats (e.g., `uuid`, `date-time`)
5. **Document error responses**: Include documentation for error cases
6. **Keep descriptions clear**: Write clear, concise descriptions for endpoints and parameters

## Versioning

The API uses URI path versioning (e.g., `/api/v1/resource`). The current version is `v1`.

When making changes:
- Non-breaking changes can be added to the current version
- Breaking changes require a new version number

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [JSDoc Documentation](https://jsdoc.app/) 