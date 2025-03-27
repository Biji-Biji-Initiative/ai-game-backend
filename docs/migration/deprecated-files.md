# Deprecated Files for Removal

The following files should be deleted as part of the challenge model refactoring to ensure a clean codebase. These files are no longer needed with the new flexible, database-driven challenge domain model.

## Files to Delete

### Constants and Enums

- `src/constants/challengeTypes.js` - Replaced by database-driven challenge types
- `src/constants/formatTypes.js` - Replaced by database-driven format types
- `src/constants/difficultyLevels.js` - Moved to domain model validation
- `src/utils/typeEnums.js` - No longer needed with dynamic types

### Legacy Helpers

- `src/utils/challengeTypeHelper.js` - Replaced by challengeTypeRepository
- `src/utils/formatTypeHelper.js` - Replaced by domain model methods
- `src/utils/legacyPromptBuilder.js` - Replaced by prompt templates in Responses API

### Testing Files

- `test-old-challenge-format.js` - Uses old challenge format
- `test-static-challenge-types.js` - Uses static challenge types
- `test-manual-challenge-mapping.js` - Uses hardcoded mappings

### Legacy Implementations

- `src/services/legacyChallengeService.js` - Old implementation without domain model
- `src/repositories/staticChallengeRepository.js` - Uses hardcoded challenge definitions

### Documentation

- `docs/challenges/old-challenge-system.md` - Documentation for the old system
- `docs/challenges/enum-based-types.md` - Documentation for enum-based types

## Code Patterns to Remove

1. **Direct Enum References**

   ```javascript
   // REMOVE: Direct enum references
   const { CHALLENGE_TYPES } = require('../constants/challengeTypes');
   const challengeType = CHALLENGE_TYPES.CRITICAL_THINKING;
   ```

2. **Static Type Mappings**

   ```javascript
   // REMOVE: Hardcoded type mappings
   const typeNames = {
     'CRITICAL_THINKING': 'Critical Thinking',
     'ETHICAL_DILEMMA': 'Ethical Dilemma'
   };
   ```

3. **Direct Format Type References**

   ```javascript
   // REMOVE: Direct format type references
   const { FORMAT_TYPES } = require('../constants/formatTypes');
   const formatType = FORMAT_TYPES.MULTIPLE_CHOICE;
   ```

4. **Legacy Challenge Creation**

   ```javascript
   // REMOVE: Old challenge creation pattern
   const challenge = {
     id: generateId(),
     userEmail,
     challengeType: CHALLENGE_TYPES.CRITICAL_THINKING,
     formatType: FORMAT_TYPES.MULTIPLE_CHOICE,
     // other properties
   };
   ```

## Replacing Deprecated Code

For each removed pattern, use the following replacements:

### Replace Enum References

```javascript
// OLD
const { CHALLENGE_TYPES } = require('../constants/challengeTypes');
const challengeType = CHALLENGE_TYPES.CRITICAL_THINKING;

// NEW
const challengeTypeCode = 'critical-thinking';
```

### Replace Static Mappings

```javascript
// OLD
const typeNames = {
  'CRITICAL_THINKING': 'Critical Thinking',
  'ETHICAL_DILEMMA': 'Ethical Dilemma'
};
const typeName = typeNames[challenge.challengeType];

// NEW
const typeName = challenge.getChallengeTypeName();
```

### Replace Legacy Challenge Creation

```javascript
// OLD
const challenge = {
  id: generateId(),
  userEmail,
  challengeType: CHALLENGE_TYPES.CRITICAL_THINKING,
  formatType: FORMAT_TYPES.MULTIPLE_CHOICE,
  // other properties
};

// NEW
const Challenge = require('../models/Challenge');
const challenge = new Challenge({
  userEmail,
  title: 'Critical Thinking Challenge',
  challengeTypeCode: 'critical-thinking',
  formatTypeCode: 'multiple-choice',
  focusArea,
  difficulty: 'intermediate',
  content: { /* challenge content */ }
});
```

## Verification After Removal

After deleting the files and updating the code, run the following to ensure everything works:

1. Ensure all tests pass:
   ```bash
   npm test
   ```

2. Check for any remaining references to deleted files:
   ```bash
   grep -r "challengeTypes\|formatTypes\|typeEnums" src/ tests/
   ```

3. Verify the application still works:
   ```bash
   npm start
   ```

## Rollback Plan

If issues arise after deletion:

1. Restore the deleted files from Git:
   ```bash
   git checkout HEAD@{1} -- src/constants/challengeTypes.js
   ```

2. Document any issues encountered in `docs/migration/removal-issues.md` 