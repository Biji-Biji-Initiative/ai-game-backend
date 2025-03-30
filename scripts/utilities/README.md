# Utility Scripts

This directory contains various utility scripts that were previously located in the root directory of the project. These scripts are used for various maintenance, build, and development tasks.

## Contents

### Import Fix Scripts
- `fix-imports.js` - Fixes import paths in JavaScript files
- `fix-imports.cjs` - CommonJS version of the import fix script
- `fix-all-imports.js` - Comprehensive import path fixing
- `fix-infra-imports.js` - Fixes imports related to infrastructure code
- `fix-remaining-imports.js` - Fixes any remaining import issues
- `fix-duplicate-infra.js` - Resolves duplicate infrastructure imports
- `normalize-imports.js` - Normalizes import paths
- `find-infra-paths.js` - Identifies infrastructure import paths

### Babel Scripts
- `babel-fix-imports.js` - Uses Babel to fix import statements
- `babel-fix-logger-imports.js` - Fixes logger import statements using Babel

### Testing Scripts
- `cucumber.js` - Configuration for Cucumber.js testing

### Development Tools
- `debug-swagger.js` - Tool for debugging Swagger API documentation
- `check-dependencies.js` - Verifies project dependencies
- `cleanup_event_files.js` - Removes temporary event files

### Configuration
- `ecosystem.config.cjs` - PM2 ecosystem configuration

## Usage

Most of these scripts are intended to be run from the command line:

```bash
node scripts/utilities/script-name.js [arguments]
```

Some scripts may be referenced in npm scripts in package.json.

## Notes

- These scripts were consolidated here from the project root to keep the root directory clean.
- If you need to update references to these scripts, make sure to update the paths to point to this directory.
- For detailed information about what each script does, please refer to the script's comments or documentation. 