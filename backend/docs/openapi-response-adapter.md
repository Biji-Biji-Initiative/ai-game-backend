# OpenAPI Response Adapter

## Overview

The OpenAPI Response Adapter is a middleware that ensures all API responses from the server match the expected schema defined in the OpenAPI specification. This is crucial for several reasons:

1. Consistent API responses across all endpoints
2. Compatibility with OpenAPI validation tools
3. Easier frontend development with predictable responses
4. Better documentation and testing

## How It Works

The adapter intercepts all responses before they are sent to the client and transforms them to match the expected OpenAPI schema format. It handles several types of transformations:

### 1. Response Format Standardization

Ensures all responses follow the format:

```json
{
  "status": "success",
  "data": { ... }
}
```

or for errors:

```json
{
  "status": "error",
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

### 2. Endpoint-Specific Transformations

The adapter contains a mapping of endpoints to their specific OpenAPI schema requirements. For example:

- `/api/v1/focus-areas` - Wraps data in a `focusAreas` object for collections
- `/api/v1/personality/profile` - Wraps data in a `profile` object
- `/api/v1/challenges` - Wraps data in a `challenges` object for collections

### 3. Legacy Format Handling

Transparently handles legacy response formats that use `{ success: true, data: ... }` instead of the new format.

## Configuration

The response adapter is configured in `app.js` and is placed in the middleware chain before the OpenAPI validator but after request logging. This ensures that all responses are properly formatted before they are validated against the OpenAPI specification.

```javascript
// Configure middleware
configureAllRequestMiddleware(app, config, container);
  
// Setup Sentry request handler for error monitoring
setupSentryRequestHandler(app);

// Configure API documentation and validation
configureOpenApiResponseAdapter(app, config, container);
configureOpenAPI(app, config, container);
```

## How to Add New Endpoint Transformations

To add a new endpoint transformation, simply update the `ENDPOINT_TRANSFORMS` object in `src/core/infra/http/middleware/openapi/responseAdapter.js`:

```javascript
const ENDPOINT_TRANSFORMS = {
  // Add your new endpoint here
  '/api/v1/your-new-endpoint': {
    collection: (data) => ({ newItems: data }),
    single: (data) => ({ newItem: data })
  },
};
```

## Adapting OpenAPI Schema to Match Implementation

In some cases, you may need to update the OpenAPI schema to match the actual implementation instead of changing the code. This is particularly useful for complex APIs where changing the implementation would be too disruptive.

To update the OpenAPI schema:

1. Identify the correct path file in `openapi/paths/`
2. Update the schema to match the actual response format
3. Run `npm run swagger:bundle` to generate the updated OpenAPI spec

## Troubleshooting

If you're seeing 500 errors related to OpenAPI validation:

1. Check if your response format matches the expected OpenAPI schema
2. Use the response adapter to transform your responses
3. Update the OpenAPI schema if necessary

## Further Development

The response adapter is designed to be extensible. Future enhancements could include:

1. Auto-discovery of schema requirements from OpenAPI files
2. More granular control over transformations
3. Performance optimizations for high-traffic endpoints 