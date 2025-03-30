# Swagger API Documentation

This document explains how the Swagger/OpenAPI documentation system is set up in the AI Fight Club API.

## Overview

The API uses [Swagger UI](https://swagger.io/tools/swagger-ui/) to provide interactive API documentation. The setup follows these design principles:

1. **Single Source of Truth**: The OpenAPI specification is defined in one place (`src/config/swagger.js`)
2. **Separation of Concerns**: Documentation setup is handled by a dedicated module (`src/config/swaggerSetup.js`)
3. **Code-First Documentation**: JSDoc comments in controllers auto-generate API endpoints documentation
4. **Consistent Experience**: The same documentation is available in all environments
5. **Graceful Failure**: Documentation failures don't crash the application

## Components

### 1. Swagger Definition (`src/config/swagger.js`)

This file contains the base OpenAPI specification including:

- API metadata (title, version, description)
- License and contact information
- Server definitions
- Common schema components
- Security scheme definitions
- Base paths (minimal examples)

The definition is the single source of truth for the OpenAPI spec.

### 2. Swagger Setup (`src/config/swaggerSetup.js`)

This module handles:

- Generating the complete OpenAPI spec by scanning JSDoc comments in the codebase
- Setting up the Swagger UI Express middleware
- Configuring the UI appearance and behavior
- Handling errors gracefully
- Registering routes for the documentation

### 3. JSDoc Annotations

Throughout the codebase, controllers and route handlers use JSDoc comments with OpenAPI annotations to document endpoints:

```javascript
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
```

## How It Works

1. At application startup, `initializeSwagger()` is called from `app.js`
2. The function uses `swagger-jsdoc` to scan the codebase for JSDoc annotations
3. It merges these annotations with the base definition from `swagger.js`
4. The complete OpenAPI spec is passed to Swagger UI Express
5. The UI is mounted at the configured path (default: `/api-docs`)

## Customization

To customize the API documentation:

1. **Base Specification**: Modify `src/config/swagger.js` for global changes
2. **JSDoc Comments**: Update annotations in controllers and route files
3. **UI Appearance**: Adjust the UI options in `src/config/swaggerSetup.js`

## Best Practices

1. **Document as You Code**: Add JSDoc annotations when implementing new endpoints
2. **Keep Examples Current**: Update examples when changing endpoint behavior
3. **Consistent Tagging**: Use consistent tags to group related endpoints
4. **Comprehensive Responses**: Document all possible response types, including errors

## Viewing Documentation

When the application is running:

- Development: Visit `http://localhost:3000/api-docs`
- Production: Visit the configured `fullDocsUrl` from the application config 