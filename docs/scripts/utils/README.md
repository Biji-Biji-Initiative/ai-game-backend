# Utility Scripts

This directory contains utility scripts for code analysis, maintenance, and quality control. These scripts help with code quality checks, schema validation, and architecture verification.

## Available Scripts

### Code Quality

- `verify-code-quality.js` - Checks code against established quality standards
- `verify-ddd-implementation.js` - Verifies Domain-Driven Design implementation

### Schema Management

- `schema-validator.js` - Validates database schema against expected structure
- `update-supabase-schema.js` - Updates Supabase schema definition

### API Management

- `update-openai-api.js` - Updates OpenAI API calls if needed

### Test Management

- `analyze-test-placement.js` - Analyzes test structure for better organization

### Refactoring Tools

- `compare_event_files.js` - Compares original and refactored event files
- `fix_event_files.js` - Fixes issues in event files
- `refactor_error_handling.js` - Refactors error handling code
- `delete_error_utils.sh` - Removes old error utility files
- `cleanup-temp-scripts.js` - Cleans up temporary scripts

## Usage

```bash
# Verify code quality
node scripts/utils/verify-code-quality.js

# Validate database schema
node scripts/utils/schema-validator.js

# Verify DDD implementation
node scripts/utils/verify-ddd-implementation.js

# Analyze test placement
node scripts/utils/analyze-test-placement.js
```

## Common Tasks

These scripts can be run through npm scripts for convenience:

```bash
# Check code quality
npm run quality

# Validate schema
npm run db:validate-schema

# Verify architecture
npm run verify:ddd
```

## Best Practices

1. Run code quality checks before committing code
2. Validate schemas after any database changes
3. Use refactoring tools carefully and review all changes
4. Backup files before running potentially destructive utilities

## Principles for Utility Scripts

1. **Analysis Over Automatic Fixing**: These scripts should primarily analyze and report issues rather than automatically modifying code, especially for complex changes. For simple fixes, use ESLint and Prettier directly.

2. **Cross-Platform Compatibility**: Utility scripts should be written in Node.js for cross-platform compatibility, avoiding shell-specific features.

3. **Error Handling**: Include robust error handling to ensure scripts fail gracefully with useful error messages.

4. **Documentation**: Include clear documentation and help text within each script.

5. **Zero Side Effects**: Utility scripts should not modify databases, external services, or production environments.

## Adding New Utility Scripts

When adding new utility scripts to this directory:

1. Create your script with a descriptive name that reflects its purpose
2. Make it executable (`chmod +x scripts/utils/your-script.js`)
3. Start with proper Node.js shebang and strict mode:
   ```javascript
   #!/usr/bin/env node
   'use strict';
   ```
4. Use chalk for colored output for better readability
5. Include proper JSDoc comments for functions
6. Add a help command-line flag for documentation
7. Add it to this README
8. Add a corresponding npm script in package.json if commonly used 