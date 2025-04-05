# OpenAPI Fixes and Validation Tools

This directory contains scripts to help identify, fix, and test OpenAPI-related issues in the API.

## Available Scripts

### 1. Validate Responses (validate-responses.js)

This script checks API responses against the OpenAPI schema to identify mismatches.

**Usage:**
```bash
node scripts/openapi-fixes/validate-responses.js
```

The script will:
- Make sample requests to all API endpoints
- Validate responses against the OpenAPI schema
- Report any validation errors found

### 2. Verify Schema (verify-schema.js)

This script analyzes all OpenAPI spec files to ensure they follow the standard response format.

**Usage:**
```bash
node scripts/openapi-fixes/verify-schema.js
```

The script will check that all API endpoints in the OpenAPI spec:
- Use the standard `status/data` response format 
- Have proper examples that match the schema
- Report any inconsistencies in the schema definitions

### 3. Test Adapter (test-adapter.js)

This script tests the OpenAPI response adapter with various input formats to ensure it correctly transforms responses.

**Usage:**
```bash
node scripts/openapi-fixes/test-adapter.js
```

The script will run several test cases:
- Standard success response with array data
- Single entity response
- Error response
- Already standardized response
- Report the transformation results for each test case

## Fixing OpenAPI Validation Issues

If you encounter OpenAPI validation issues, follow these steps:

1. **Run the validation scripts** to identify where the issues are occurring
2. **Check the response format** - ensure it follows the standard format:
   ```json
   {
     "status": "success",
     "data": {
       "resourceName": {
         // Resource data
       }
     }
   }
   ```
   or for collections:
   ```json
   {
     "status": "success",
     "data": {
       "resourceNames": [
         // Array of resources
       ]
     }
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

3. **Update the OpenAPI spec** if needed to match the actual implementation
4. **Add transformation mappings** to the response adapter if needed for specific endpoints
5. **Run the test scripts again** to verify the fixes

## Response Adapter Configuration

The OpenAPI response adapter is configured in `src/core/infra/http/middleware/openapi/responseAdapter.js`.

To add support for a new endpoint pattern, update the `ENDPOINT_TRANSFORMS` object with a new mapping:

```javascript
const ENDPOINT_TRANSFORMS = {
  // Add your new endpoint pattern and transformation function
  '/api/v1/your-resources': transformCollection('yourResources'),
  '/api/v1/your-resources/[^/]+': transformSingle('yourResource')
};
```

## Common Issues and Solutions

1. **Schema validation errors**: Ensure your OpenAPI schema matches the actual response format. Update the schema to match the real implementation.

2. **Missing response wrappers**: If your API returns data without proper wrappers (like `focusAreas` for collections), add a transformation mapping to the response adapter.

3. **Inconsistent error formats**: Make sure all error handlers follow the standard error format. Check the error middleware in `src/core/infra/http/middleware/errorHandler.js`.

4. **OpenAPI spec regeneration**: After making changes to path files, regenerate the OpenAPI spec with:
   ```bash
   npm run swagger:bundle
   ``` 