# Test Cleanup Scripts

This directory contains scripts for analyzing and cleaning up test files to reduce duplication and improve organization.

## Scripts Overview

1. **test-analysis.js** - Analyzes test files in depth and generates a report
2. **aggressive-test-cleanup.js** - Performs cleanup based on analysis results
3. **fix-test-imports.js** - Fixes import paths after test files are reorganized
4. **preserve-esm-tests.js** - Identifies and keeps only ESM tests, removing CommonJS tests
5. **final-test-report.js** - Generates a final report about the test cleanup process

## Step-by-Step Cleanup Process

### Option 1: Clean up ESM Tests (Recommended)

If you want to keep only ESM tests and remove CommonJS tests:

1. Run the ESM preservation script:

```bash
node scripts/preserve-esm-tests.js
```

This will:
- Find all test files in the project
- Identify which use ESM (import/export) and which use CommonJS (require/module.exports)
- Keep all ESM tests and remove CommonJS tests
- Create backups of removed files
- Generate logs of kept and removed files

2. Generate a final report:

```bash
node scripts/final-test-report.js
```

This creates a detailed markdown report of the cleanup process.

### Option 2: Consolidate Test Files

If you want to consolidate and reorganize test files:

1. Run the analysis script to understand the current state of your test files:

```bash
node scripts/test-analysis.js
```

2. Review the test-analysis-results.json file

3. Run the aggressive cleanup script to consolidate files:

```bash
node scripts/aggressive-test-cleanup.js
```

4. Run the import fix script to update import paths:

```bash
node scripts/fix-test-imports.js
```

### All-in-One Approach

To run the entire cleanup process with prompts:

```bash
node scripts/run-test-cleanup.js
```

## Important Notes

- All removed/changed files are backed up in the `tests-backup` directory
- Logs of all actions are stored in the `logs` directory
- If tests fail after cleanup, check configuration files for conflicts
- The ESM-only approach is recommended for projects transitioning to ES modules

## Safety Measures

- The `aggressive-test-cleanup.js` script always creates a backup before making changes
- If tests fail after cleanup, you can restore from the backup
- Backup directory: `tests-backup/tests-aggressive-{timestamp}`

## Customizing the Cleanup

If you want to modify how aggressively files are cleaned up:

1. Edit `test-analysis.js` to change detection criteria for duplicates
2. Edit `aggressive-test-cleanup.js` to modify which files are removed
3. Run manually step by step to have more control

## After Cleanup

After running the cleanup scripts:

1. Run your test suite to verify that everything still works
2. Review the changes made to ensure nothing important was removed
3. Commit the changes to your repository 