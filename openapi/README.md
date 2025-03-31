# OpenAPI Schema-First Documentation

This directory contains the OpenAPI/Swagger schema-first API documentation for the AI Fight Club API.

## Structure

The OpenAPI documentation is structured as follows:

- `index.yaml`: The root OpenAPI document containing info, servers, tags, and references to paths and components
- `components/`: Contains reusable components
  - `schemas/`: Contains data models/schemas
  - `parameters/`: Contains reusable parameters
  - `responses/`: Contains reusable responses
- `paths/`: Contains API paths grouped by domain

## Workflow

The workflow for managing the API documentation is as follows:

1. **Define Schemas**: Define data models in `components/schemas/`
2. **Define Paths**: Define API paths in `paths/` organized by domain
3. **Bundle**: Run `npm run swagger:bundle` to create a bundled OpenAPI specification
4. **Serve**: The API server loads the bundled specification to serve the Swagger UI
5. **Validate**: API requests and responses are validated against the schema at runtime

## Commands

- `npm run swagger:bundle`: Bundles the OpenAPI YAML files into a single JSON file (`openapi-spec.json`)
- `npm run swagger:bundle:yaml`: Bundles the OpenAPI YAML files into a single YAML file (`openapi-spec.yaml`)
- `npm run swagger:setup`: Bundles the specification and sets up runtime validation
- `npm run swagger:setup-validator`: Sets up runtime validation middleware in the Express app

## Adding New Endpoints

To add a new endpoint:

1. **Define Schema**: If the endpoint uses a new data model, define it in `components/schemas/`
2. **Define Path**: Add the endpoint to the appropriate path file in `paths/` (or create a new file)
3. **Update Root**: If you created a new path file, add a reference to it in `index.yaml`
4. **Bundle**: Run `npm run swagger:bundle` to update the bundled specification

## Example Schema

```yaml
# components/schemas/MyEntity.yaml
type: object
description: A sample entity
required:
  - id
  - name
properties:
  id:
    type: string
    format: uuid
    description: Unique identifier
  name:
    type: string
    description: Entity name
  created:
    type: string
    format: date-time
    description: Creation timestamp
```

## Example Path

```yaml
# paths/my-domain.yaml
my_entities:
  get:
    summary: Get all entities
    description: Retrieves a list of all entities with pagination
    operationId: getAllEntities
    tags:
      - MyDomain
    security:
      - bearerAuth: []
    parameters:
      - $ref: '../components/parameters/common.yaml#/limitParam'
      - $ref: '../components/parameters/common.yaml#/offsetParam'
    responses:
      '200':
        description: Entities retrieved successfully
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
                    $ref: '../components/schemas/MyEntity.yaml'
      '401':
        $ref: '../components/responses/common.yaml#/UnauthorizedError'
```

## Best Practices

1. **Use References**: Use `$ref` to reference components to avoid duplication
2. **Consistent Naming**: Use consistent naming conventions (e.g., camelCase for properties)
3. **Add Descriptions**: Include descriptions for all components and properties
4. **Examples**: Add examples where helpful for better documentation
5. **Required Fields**: Mark required fields appropriately
6. **Format Specifiers**: Use format specifiers like `uuid`, `email`, `date-time` where applicable
7. **Response Codes**: Document all possible response codes, not just successful responses 