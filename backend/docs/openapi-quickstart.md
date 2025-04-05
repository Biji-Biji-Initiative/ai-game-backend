# OpenAPI Quick Start Guide

Welcome to our standardized API response system! This guide will help you quickly understand how our API responses are structured and how our OpenAPI implementation works.

## Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "status": "success",
  "data": {
    "resourceName": { 
      // Single resource object
    }
  }
}
```

OR for collections:

```json
{
  "status": "success",
  "data": {
    "resourceNames": [
      // Array of resource objects
    ]
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "User-friendly error message",
  "code": "ERROR_CODE"
}
```

## Key Components

Our OpenAPI implementation consists of several important components:

1. **Response Adapter Middleware**: Transforms API responses to match OpenAPI schemas
   - Located at: `src/core/infra/http/middleware/openapi/responseAdapter.js`

2. **OpenAPI Schema Files**: Define the expected request/response structures
   - Located at: `openapi/paths/*.yaml`

3. **Validation & Testing Scripts**: Tools to verify response formats
   - Located at: `scripts/openapi-fixes/`

## Getting Started

### 1. Understanding Response Transformation

The Response Adapter middleware automatically transforms your API responses to match the expected OpenAPI format. For example:

```javascript
// Your controller returns this:
return res.json({
  success: true,
  data: [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" }
  ]
});

// Response adapter transforms it to:
{
  "status": "success",
  "data": {
    "items": [
      { "id": "1", "name": "Item 1" },
      { "id": "2", "name": "Item 2" }
    ]
  }
}
```

### 2. Creating a New Endpoint

When creating a new API endpoint:

1. Create the route handler in the appropriate controller
2. Define the OpenAPI schema in `openapi/paths/your-endpoint.yaml`
3. Add endpoint transformation (if needed) in `responseAdapter.js`:

```javascript
// In responseAdapter.js
const ENDPOINT_TRANSFORMS = {
  // Existing transforms...
  
  // Add your new endpoint:
  '/api/v1/your-resources': transformCollection('yourResources'),
  '/api/v1/your-resources/[^/]+': transformSingle('yourResource')
};
```

4. Regenerate the OpenAPI spec: `npm run swagger:bundle`

### 3. Testing Your Endpoint

Verify your endpoint works with our standard format:

```bash
# Test the response adapter
node scripts/openapi-fixes/test-adapter.js

# Check schema consistency
node scripts/openapi-fixes/verify-schema.js

# Validate real API responses
node scripts/openapi-fixes/validate-responses.js
```

## Common Patterns

### Collection Endpoints

For endpoints returning multiple items:
- Use plural names in the response wrapper: `"resourceNames": [...]`
- Add to `ENDPOINT_TRANSFORMS` using: `transformCollection('resourceNames')`

### Single Item Endpoints 

For endpoints returning a single item:
- Use singular names in the response wrapper: `"resourceName": {...}`
- Add to `ENDPOINT_TRANSFORMS` using: `transformSingle('resourceName')`

### Error Handling

For consistent error responses:
- Use the standard error handler middleware
- Always include a message and code in error responses

## Need Help?

- Check our [Implementation Guide](./openapi-solution-implementation.md) for details
- Review test scripts in `scripts/openapi-fixes/` for examples
- Look at existing endpoint implementations for reference

Happy coding! 