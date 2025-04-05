# OpenAPI Response Adapter Implementation Guide

This guide provides step-by-step instructions for implementing and maintaining the OpenAPI Response Adapter in your project. This solution ensures API responses are consistent and comply with OpenAPI specifications.

## Overview

The OpenAPI Response Adapter is middleware that transforms API responses to match OpenAPI schemas. It handles:

1. Transforming legacy response formats to the standard format
2. Ensuring consistent response structures across all endpoints
3. Wrapping response data in appropriate containers (e.g., collections, individual entities)
4. Converting error responses to a standardized format

## Implementation Steps

### Step 1: Install the Response Adapter

1. Create the adapter middleware file at `src/core/infra/http/middleware/openapi/responseAdapter.js`
2. Install dependencies:
   ```bash
   npm install js-yaml chalk
   ```

### Step 2: Configure the Adapter in Your Application

Add the response adapter middleware to your Express application setup:

```javascript
// In app.js or middleware configuration file
import { createOpenApiResponseAdapter } from './core/infra/http/middleware/openapi/responseAdapter.js';

// Apply middleware (after request parsing but before routes)
app.use(createOpenApiResponseAdapter());
```

Ensure the adapter is placed:
- After request parsing middleware (body-parser, etc.)
- Before route handlers
- Before error handlers

### Step 3: Update OpenAPI Specifications

Ensure your OpenAPI specs follow the standard format:

```yaml
# Example response schema in OpenAPI YAML
responses:
  '200':
    description: Success
    content:
      application/json:
        schema:
          type: object
          properties:
            status:
              type: string
              enum: [success]
            data:
              type: object
              properties:
                focusAreas:
                  type: array
                  items:
                    $ref: '#/components/schemas/FocusArea'
          required:
            - status
            - data
```

### Step 4: Add Endpoint Transformations

Add transform mappings for each endpoint pattern in the response adapter:

```javascript
// In responseAdapter.js
const ENDPOINT_TRANSFORMS = {
  // Focus Areas
  '/api/v1/focus-areas': transformCollection('focusAreas'),
  '/api/v1/focus-areas/[^/]+': transformSingle('focusArea'),
  
  // Add your endpoints here
  '/api/v1/your-resources': transformCollection('yourResources'),
  '/api/v1/your-resources/[^/]+': transformSingle('yourResource')
};
```

## Testing Your Implementation

### 1. Run the Adapter Tests

```bash
node scripts/openapi-fixes/test-adapter.js
```

This will test the adapter with various input formats and verify transformations.

### 2. Verify Schema Consistency

```bash
node scripts/openapi-fixes/verify-schema.js
```

This checks all your OpenAPI specs for the standard response format.

### 3. Validate Actual Responses

```bash
node scripts/openapi-fixes/validate-responses.js
```

This tests actual API responses against the OpenAPI specs.

## Adding New Endpoints

When adding new endpoints:

1. Update the OpenAPI spec with the correct response format
2. Add a transformation mapping in the adapter if needed
3. Run the verification and testing scripts
4. Regenerate the OpenAPI spec bundle:
   ```bash
   npm run swagger:bundle
   ```

## Troubleshooting

### Common Issues

1. **Validation Errors**:
   - Check if the path is included in `ENDPOINT_TRANSFORMS`
   - Verify the OpenAPI spec matches the expected response format
   - Check for typos in property names

2. **Missing Transformations**:
   - If a path is missing a transformation, the response won't be properly adapted
   - Add the missing pattern to `ENDPOINT_TRANSFORMS`

3. **Inconsistent Schemas**:
   - Run `verify-schema.js` to identify inconsistent schemas
   - Update YAML files in `openapi/paths/` directory

## Best Practices

1. **Maintain Consistency**: Use the same response format across all endpoints:
   ```json
   {
     "status": "success",
     "data": {
       "resourceName": { ... }
     }
   }
   ```

2. **Error Handling**: Ensure all errors follow the standard format:
   ```json
   {
     "status": "error",
     "message": "Error message",
     "code": "ERROR_CODE"
   }
   ```

3. **Regular Validation**: Run validation scripts regularly to catch inconsistencies

4. **Documentation**: Update the documentation when adding new endpoints or changing existing ones

## Conclusion

By following this implementation guide, you'll maintain a consistent API that complies with OpenAPI specifications. This ensures a better developer experience and reduces integration issues for API consumers.