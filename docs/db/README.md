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

## Applying Schemas Through Supabase Dashboard

If you encounter issues with the `exec_sql` RPC function not being available, you can apply the schema manually through the Supabase dashboard:

1. Log in to the Supabase dashboard
2. Select your project
3. Go to the "SQL Editor" section
4. Create a new query
5. Copy the content of the schema file you want to apply
6. Paste it into the SQL editor
7. Click "Run" to execute the SQL statements

Alternatively, you may need to create the `exec_sql` function if your Supabase project doesn't already have it:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql_query text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
```

This function needs to be created with appropriate permissions, which typically requires a Supabase administrator role 