# API Documentation Guide

This guide explains how to maintain and update the OpenAPI documentation for the AI Fight Club API.

## Overview

Our API documentation is now based on a "schema-first" approach using the OpenAPI 3.0 specification. This means:

1. The API is defined in YAML files located in the `openapi` directory
2. These files are bundled into a single specification file
3. Swagger UI displays this specification in the browser
4. Express-OpenAPI-Validator validates requests/responses against this specification at runtime

This approach provides several benefits:
- Single source of truth for API contracts
- Consistent documentation across all endpoints
- Runtime validation to catch API contract violations
- Clear separation of API definition from implementation code

## Directory Structure

The OpenAPI documentation is structured as follows:

```
openapi/
├── index.yaml                   # Root document with API info and references
├── README.md                    # Documentation about the documentation structure
├── components/                  # Reusable components
│   ├── parameters/              # Reusable parameters
│   │   └── common.yaml          # Common parameters like pagination
│   ├── responses/               # Reusable responses
│   │   └── common.yaml          # Common responses like errors
│   └── schemas/                 # Data models
│       ├── index.yaml           # References to all schemas
│       ├── User.yaml            # User schema
│       ├── Challenge.yaml       # Challenge schema
│       └── ...                  # Other schemas
└── paths/                       # API paths grouped by domain
    ├── auth.yaml                # Authentication endpoints
    ├── challenges.yaml          # Challenge endpoints
    ├── users.yaml               # User endpoints
    └── ...                      # Other domains
```

## Workflow for Updating Documentation

### Adding a New Schema

1. Create a new YAML file in `openapi/components/schemas/`
2. Define the schema properties, required fields, etc.
3. Add a reference to the schema in `openapi/components/schemas/index.yaml`
4. Run `npm run swagger:bundle` to update the bundled specification

Example:
```yaml
# openapi/components/schemas/NewFeature.yaml
type: object
description: A new feature in the system
required:
  - id
  - name
properties:
  id:
    type: string
    format: uuid
    description: Unique identifier for the feature
  name:
    type: string
    description: Name of the feature
  createdAt:
    type: string
    format: date-time
    description: When the feature was created
```

### Adding a New Endpoint

1. Identify or create the appropriate path file in `openapi/paths/`
2. Add the endpoint definition with path, method, parameters, responses, etc.
3. Add a reference to the path in `openapi/index.yaml` if it's a new path file
4. Run `npm run swagger:bundle` to update the bundled specification

Example:
```yaml
# openapi/paths/features.yaml
features:
  get:
    summary: Get all features
    description: Retrieves a list of all features with pagination
    operationId: getAllFeatures
    tags:
      - Features
    security:
      - bearerAuth: []
    parameters:
      - $ref: '../components/parameters/common.yaml#/limitParam'
      - $ref: '../components/parameters/common.yaml#/offsetParam'
    responses:
      '200':
        description: Features retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: array
                  items:
                    $ref: '../components/schemas/NewFeature.yaml'
      '401':
        $ref: '../components/responses/common.yaml#/UnauthorizedError'
```

Then update index.yaml:
```yaml
# openapi/index.yaml
paths:
  # ... existing paths
  /features:
    $ref: './paths/features.yaml#/features'
```

## Validation Rules

When defining schemas and endpoints, follow these rules to ensure consistent documentation:

1. **Use References**: Use `$ref` for common components to avoid duplication
2. **Required Fields**: Mark required fields with the `required` property
3. **Descriptions**: Include descriptions for all properties, parameters, and responses
4. **Format Specifiers**: Use format specifiers like `uuid`, `email`, and `date-time` where applicable
5. **Response Codes**: Document all possible response codes (200, 400, 401, 403, 404, etc.)
6. **Security**: Add `security` section to protected endpoints
7. **Tags**: Use consistent tags to group related endpoints
8. **Operation IDs**: Use unique operation IDs for each endpoint
9. **Examples**: Include examples where helpful

## Runtime Validation

Our API uses express-openapi-validator middleware to validate requests and responses:

- Request validation is always enabled
- Response validation is enabled in development environment only
- Failed validation returns a 400 error with details about the validation failure

This helps catch contract violations during development and ensures consistency between the API implementation and documentation.

## Commands

The following npm scripts are available for working with the OpenAPI documentation:

- `npm run swagger:bundle`: Bundles YAML files into openapi-spec.json
- `npm run swagger:bundle:yaml`: Bundles YAML files into openapi-spec.yaml
- `npm run swagger:setup`: Runs bundling and sets up validation middleware
- `npm run swagger:setup-validator`: Sets up validation middleware
- `npm run swagger:remove-jsdoc`: Removes JSDoc @swagger annotations from controllers

## Viewing the Documentation

When the API is running, you can view the documentation at:

- Development: http://localhost:3000/api-docs
- Production: {productionUrl}/api-docs

## Migrating from JSDoc Annotations

We've migrated from using JSDoc @swagger annotations to this schema-first approach. If you find any controllers with @swagger annotations, you can remove them with:

```bash
npm run swagger:remove-jsdoc
```

## Best Practices

1. **Keep Documentation Updated**: Update the documentation when changing the API
2. **Use References**: Use $ref to reference components to avoid duplication
3. **Consistent Naming**: Use consistent naming conventions for properties
4. **Run Validation**: Test with validation enabled to catch inconsistencies
5. **Document Everything**: Include all parameters, responses, and error cases
6. **Path Organization**: Group related endpoints in the same path file
7. **Schema Organization**: Create separate schema files for distinct entities

## Troubleshooting

If you encounter issues with the OpenAPI documentation:

1. **Validation Errors**: Check browser console or server logs for details
2. **Bundling Errors**: Verify YAML syntax and references
3. **Documentation Not Showing**: Ensure bundling was successful
4. **Runtime Validation Failures**: Update the spec or implementation to match 