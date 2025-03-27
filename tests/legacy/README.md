# Legacy Tests

This directory contains test files that were moved here during the migration to our domain-driven test structure. 

## Purpose

These files are preserved for reference and may contain valuable test cases that should be migrated to the new structure. The files here are not actively run as part of our test suites. Instead, they serve as a historical reference and a source of test cases for the new structure.

## File Naming

Files in this directory follow these naming patterns:
- `challenges_*.js`: Tests from the old tests/challenges directory
- `focus-areas_*.js`: Tests from the old tests/focus-areas directory
- `integration_*.test.js`: Tests from the old tests/real-api/integration directory

## Migration Strategy

When working with these files:

1. **Review the test cases**: Examine the tests to understand what functionality they're testing
2. **Look for gaps**: Compare with our current domain tests to find missing coverage
3. **Move test cases**: Implement any missing test cases in the appropriate domain test files
4. **Use our new style**: Follow our in-memory testing approach for minimal mocking

## Finding Corresponding Files

Test cases from these files have likely been migrated to:

- Challenge-related tests → `tests/domains/challenge/`
- Focus area tests → `tests/domains/focusArea/`
- Cross-domain tests → `tests/integration/`
- Real API tests → `tests/real-api/`

## Timeline

This directory is temporary and will be removed once we're confident that all valuable test cases have been migrated to our new structure.

## Next Steps

1. Review the test files in this directory
2. Identify any test cases that aren't covered in our new structure
3. Implement those test cases using our domain-driven approach
4. Mark files as "migrated" when completed
5. Eventually remove this legacy directory 