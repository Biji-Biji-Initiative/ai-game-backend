# Project Test Suite Cleanup

This project includes tools for cleaning up and optimizing your test suite.

## Test Cleanup Scripts

The `scripts` directory contains tools to analyze and clean up test files:

### Quick Start

To run the complete cleanup process with guidance:

```bash
node scripts/run-test-cleanup.js
```

This will:
1. Run analysis on your test files
2. Show you what will be cleaned up
3. Ask for confirmation before making changes
4. Create backups of your test files
5. Perform the cleanup
6. Optionally run tests to verify everything still works

### Manual Process

If you prefer to run each step individually:

1. **Analyze test files**:
   ```bash
   node scripts/test-analysis.js
   ```

2. **Clean up test files**:
   ```bash
   node scripts/aggressive-test-cleanup.js
   ```

3. **Fix import paths** (if needed):
   ```bash
   node scripts/fix-test-imports.js
   ```

For more details, see [scripts/README.md](scripts/README.md).

## Why Clean Up Tests?

Having too many test files can lead to:
- Slow test runs
- Duplicate test cases
- Maintenance difficulties
- Confusion about which tests matter

The cleanup process helps by:
- Removing empty and stub test files
- Consolidating similar tests
- Reducing duplicate test cases
- Organizing tests by domain and type

## Safety Measures

All cleanup operations include automatic backups of your test files. If anything goes wrong, you can restore from these backups located in the `tests-backup` directory. 