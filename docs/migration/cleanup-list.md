# Files to Delete During Cleanup

The following files have been identified for deletion as part of the challenge domain refactoring:

## Temporary Test Files

1. `test-challenge-generation-fixed.js` - Replaced by `test-challenge-generation.js`
2. `test-challenge-generation-fixed.js.bak` - Backup file of the above

## Old Challenge Type Files

1. `src/constants/challengeTypes.js` - Replaced by database-driven challenge types
2. `src/constants/formatTypes.js` - Replaced by database-driven format types
3. `src/utils/challengeTypeHelper.js` - Replaced by the Challenge domain model

## Legacy Implementation Files

1. `src/services/legacyChallengeService.js` - Replaced by new domain-driven service
2. `src/repositories/staticChallengeRepository.js` - Replaced by dynamic repository

## Old Documentation

1. `docs/challenges/old-challenge-system.md` - Documentation for the old system
2. `docs/challenges/enum-based-types.md` - Documentation for enum-based types

## Steps to Delete Files

1. First, ensure all tests pass with the new implementation:
   ```bash
   npm test
   ```

2. Delete temporary test files:
   ```bash
   rm test-challenge-generation-fixed.js
   rm test-challenge-generation-fixed.js.bak
   ```

3. Delete old implementations:
   ```bash
   rm src/constants/challengeTypes.js
   rm src/constants/formatTypes.js
   rm src/utils/challengeTypeHelper.js
   rm src/services/legacyChallengeService.js
   rm src/repositories/staticChallengeRepository.js
   ```

4. Delete old documentation:
   ```bash
   rm docs/challenges/old-challenge-system.md
   rm docs/challenges/enum-based-types.md
   ```

5. Run tests again to ensure everything still works:
   ```bash
   npm test
   ```

## Files to Keep for Reference

The following files should be kept for reference until the migration is fully complete:

1. `migrations/challenge_table.sql` - Contains the database schema
2. `scripts/seed-challenge-types.js` - Used to seed initial data
3. `test-challenge-model.js` - Tests the Challenge domain model
4. `test-dynamic-challenge-types.js` - Tests parent-child relationships
5. `test-challenge-caching.js` - Tests caching mechanisms

## Post-Cleanup Verification

After deleting the files:

1. Run linting to ensure no references to deleted files remain:
   ```bash
   npm run lint
   ```

2. Check for any imports of deleted files:
   ```bash
   grep -r "challengeTypes\|formatTypes\|challengeTypeHelper" src/
   ```

3. Run the application to verify everything works:
   ```bash
   npm start
   ```

If any issues are found, consult the migration documentation or restore the necessary files from version control. 