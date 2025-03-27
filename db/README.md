# Database Organization for Domain-Driven Design

This directory contains the database schema definitions organized according to Domain-Driven Design (DDD) principles.

## Structure

The database schema is organized as follows:

```
db/
├── domains/                # Domain-specific schemas
│   ├── user/               # User domain
│   │   └── schema.sql      # User domain schema
│   ├── challenge/          # Challenge domain
│   │   └── schema.sql      # Challenge domain schema
│   ├── evaluation/         # Evaluation domain
│   │   └── schema.sql      # Evaluation domain schema
│   ├── progress/           # Progress domain
│   │   └── schema.sql      # Progress domain schema
│   └── ...
├── apply-schema.js         # Script to apply the entire schema
├── apply-domain-schema.js  # Script to apply a specific domain schema
├── schema.sql              # Combined schema (legacy, prefer domain-specific)
└── README.md               # This file
```

## Domain-Driven Design and Database Organization

In Domain-Driven Design, we organize the codebase around business domains. This organization extends to the database schema as well. Each domain has its own database schema that represents the entities and relationships within that domain.

### Benefits of Domain-Based Database Organization

1. **Bounded Context**: Each domain has its own schema, reflecting its bounded context
2. **Clear Ownership**: Domain teams own their database schema
3. **Reduced Coupling**: Schema changes in one domain have minimal impact on other domains
4. **Easier Maintenance**: Smaller, focused schema files are easier to maintain

## Working with Database Schemas

### Applying the Full Schema

To apply the entire database schema:

```bash
node db/apply-schema.js
```

### Applying a Domain-Specific Schema

To apply a schema for a specific domain:

```bash
node db/apply-domain-schema.js user
node db/apply-domain-schema.js challenge
# etc.
```

## Best Practices

1. **Keep Domain Schemas Separate**: Each domain should have its own schema file
2. **Use Foreign Keys Sparingly**: Foreign keys should be used only for critical relationships
3. **Document with Comments**: Use SQL comments to document tables, columns, and constraints
4. **Create Indexes**: Add indexes for frequently queried columns
5. **Version Control**: All schema changes should be version controlled
6. **Migrations**: For production, use proper migration scripts instead of recreating schemas

## Adding a New Domain

To add a new domain to the database schema:

1. Create a new directory under `db/domains/` with the domain name
2. Create a `schema.sql` file in the new directory
3. Define the tables, indexes, and constraints for that domain
4. Apply the schema with `node db/apply-domain-schema.js <domain-name>`

## Schema Documentation

Each schema file should include:

- Table definitions with proper constraints
- Indexes for performance optimization
- Comments describing the purpose of tables and columns
- Any domain-specific functions or triggers 