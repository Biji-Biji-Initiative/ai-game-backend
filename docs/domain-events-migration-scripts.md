# Domain Events Migration Scripts

This document provides a guide for using the domain event migration scripts to convert your codebase from direct event publishing to entity-based event collection.

## Overview

The migration scripts automate the process of updating your code to use the standardized entity-based event collection pattern. This includes:

1. **Service Updates**: Convert service files to use entity-based event collection
2. **Coordinator Updates**: Convert coordinator files to use entity-based event collection
3. **Event File Updates**: Convert event files to use repository-based event handling
4. **Verification**: Identify any remaining instances of direct event publishing

## Available Scripts

All scripts support a `--dry-run` flag to preview changes without modifying files.

### Service Update Script

Updates service files to use entity-based event collection.

```bash
# Preview changes
npm run events:update-services:dry

# Apply changes
npm run events:update-services
```

### Coordinator Update Script

Updates coordinator files to use entity-based event collection.

```bash
# Preview changes
npm run events:update-coordinators:dry

# Apply changes
npm run events:update-coordinators
```

### Event Files Update Script

Updates event files to use repository-based event handling.

```bash
# Preview changes
npm run events:update-event-files:dry

# Apply changes
npm run events:update-event-files
```

### Verification Script

Identifies any remaining instances of direct event publishing.

```bash
# Basic verification
npm run events:verify

# Detailed verification
npm run events:verify:verbose
```

### Combined Migration Scripts

Run all scripts in sequence:

```bash
# Preview all changes
npm run events:migrate:dry

# Apply all changes
npm run events:migrate
```

### Full Migration with Reporting

For a complete migration process with pre-migration checks, backups, and detailed reporting:

```bash
# Preview full migration
npm run events:full-migration:dry

# Apply full migration
npm run events:full-migration
```

The full migration script supports the following flags:

- `--dry-run`: Preview changes without modifying files
- `--skip-backup`: Skip the backup step (not recommended for production)
- `--skip-notify`: Skip the notification step

## Reports

All scripts generate reports in the `reports/` directory, containing:

- Summary of changes made
- Lists of updated and skipped files
- Detailed error information (if any)
- Verification results

## Migration Process

For best results, follow this migration process:

1. **Preparation**:
   - Ensure all tests are passing
   - Commit or stash any pending changes
   - Make sure your workspace is clean

2. **Dry Run**:
   - Run `npm run events:full-migration:dry` to see what changes would be made
   - Review the reports to understand the scope of changes

3. **Migration**:
   - Run `npm run events:full-migration` to apply all changes
   - The script will:
     - Perform pre-migration checks
     - Create a backup of your codebase
     - Apply all updates
     - Verify the results
     - Generate comprehensive reports

4. **Verification**:
   - Check the reports for any issues
   - Run tests to ensure functionality still works
   - Manual review of critical components

5. **Follow-up**:
   - Address any remaining instances of direct event publishing
   - Update tests to reflect the new event handling pattern

## Manual Intervention

Some files may require manual intervention if:

1. The script identifies patterns it can't automatically update
2. The file has complex logic that requires human judgment
3. The verification script still identifies issues after migration

In these cases, follow the patterns established in the [Domain Events Migration Guide](domain-events-migration-guide.md) to manually update the code.

## Troubleshooting

If you encounter issues:

1. Check the logs in the `logs/` directory for detailed error information
2. Look for specific error messages in the report files
3. Consider running individual scripts with the `--verbose` flag
4. Restore from the backup in `backups/` if needed

## Additional Resources

- [Domain Events Migration Guide](domain-events-migration-guide.md)
- [Repository Implementation Guide](repository-implementation-guide.md)
- [Event Handler Example](event-handler-example.md)
- [Repository Example](repository-example.md) 