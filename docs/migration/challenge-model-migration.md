# Challenge Model Migration Guide

This guide provides step-by-step instructions for migrating from the legacy challenge model to the new flexible, database-driven challenge domain model.

## Overview of Changes

The challenge system has been refactored from:

- ❌ Hardcoded challenge types using enum-like constants
- ❌ No hierarchical relationship between types
- ❌ Limited metadata support
- ❌ Inconsistent object structure

To:

- ✅ Flexible, database-driven challenge types
- ✅ Support for parent-child relationships
- ✅ Rich metadata for all types
- ✅ Consistent domain model with validation

## Migration Steps

### 1. Database Migration

First, run the database migration scripts to create the new tables:

```bash
# Navigate to the migrations directory
cd migrations

# Run the challenge tables migration script
node run-migration.js challenge_table.sql
```

This will create the following tables:
- `challenge_types`
- `challenge_format_types`
- `trait_challenge_mappings`
- `focus_area_challenge_mappings`

### 2. Seed Initial Data

Run the seed script to populate the database with the initial challenge types:

```bash
# Run the seed script
node scripts/seed-challenge-types.js
```

This script creates:
- Base challenge types (critical-thinking, ethical-dilemma, etc.)
- Format types (multiple-choice, open-ended, etc.)
- Default mappings for traits and focus areas

### 3. Update Challenge Generation Code

#### Old Code (Before):

```javascript
const generateChallenge = async (userEmail, focusArea) => {
  const challengeType = CHALLENGE_TYPES.CRITICAL_THINKING;
  const formatType = FORMAT_TYPES.MULTIPLE_CHOICE;
  
  const challenge = {
    id: generateId(),
    userEmail,
    challengeType,
    formatType,
    focusArea,
    // other properties
  };
  
  return challenge;
};
```

#### New Code (After):

```javascript
const generateChallenge = async (userEmail, focusArea) => {
  // Get challenge type from repository
  const challengeTypeCode = 'critical-thinking';
  const formatTypeCode = 'multiple-choice';
  
  // Create challenge using the domain model
  const challenge = new Challenge({
    userEmail,
    title: 'Critical Thinking Challenge',
    challengeTypeCode,
    formatTypeCode,
    focusArea,
    difficulty: 'intermediate',
    content: { /* challenge content */ }
  });
  
  return challenge;
};
```

### 4. Update Repository References

Replace direct enum references with repository calls:

#### Old Code (Before):

```javascript
const { CHALLENGE_TYPES } = require('../constants/challengeTypes');

const getChallengeTypeForTrait = (trait) => {
  const mappings = {
    'analyticalThinking': CHALLENGE_TYPES.CRITICAL_THINKING,
    'creativity': CHALLENGE_TYPES.CREATIVE_SYNTHESIS,
    // other mappings
  };
  
  return mappings[trait] || CHALLENGE_TYPES.CRITICAL_THINKING;
};
```

#### New Code (After):

```javascript
const challengeTypeRepository = require('../repositories/challengeTypeRepository');

const getChallengeTypeForTrait = async (trait) => {
  // Get mappings from repository
  const traitMappings = await challengeTypeRepository.getTraitMappings();
  
  // Get challenge type code from mappings
  const challengeTypeCode = traitMappings[trait] || 'critical-thinking';
  
  return challengeTypeCode;
};
```

### 5. Update Challenge Storage and Retrieval

#### Old Code (Before):

```javascript
// Save challenge
const saveChallenge = async (challenge) => {
  const { data, error } = await supabase
    .from('challenges')
    .insert(challenge);
  
  if (error) throw error;
  return data;
};

// Get challenge
const getChallenge = async (id) => {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};
```

#### New Code (After):

```javascript
// Save challenge
const saveChallenge = async (challenge) => {
  // Validate challenge using domain model
  if (!challenge.isValid()) {
    throw new Error('Invalid challenge');
  }
  
  const { data, error } = await supabase
    .from('challenges')
    .insert(challenge.toObject());
  
  if (error) throw error;
  return data;
};

// Get challenge
const getChallenge = async (id) => {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  
  // Convert to domain model
  return Challenge.fromDatabase(data);
};
```

### 6. Update API Response Handling

#### Old Code (Before):

```javascript
app.get('/api/challenges/:id', async (req, res) => {
  try {
    const challenge = await getChallenge(req.params.id);
    
    res.json({
      status: 'success',
      data: {
        challenge: {
          ...challenge,
          typeName: getTypeName(challenge.challengeType),
          formatName: getFormatName(challenge.formatType)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

#### New Code (After):

```javascript
app.get('/api/challenges/:id', async (req, res) => {
  try {
    const challenge = await getChallenge(req.params.id);
    
    res.json({
      status: 'success',
      data: {
        challenge: {
          ...challenge.toObject(),
          typeName: challenge.getChallengeTypeName(),
          formatName: challenge.getFormatTypeName()
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

### 7. File Clean-up

Remove obsolete files:

- `constants/challengeTypes.js`
- `constants/formatTypes.js`
- `utils/challengeTypeHelper.js`

### 8. Update Tests

#### Old Test (Before):

```javascript
test('should generate challenge with correct type', () => {
  const challenge = generateChallenge('user@example.com', 'AI Ethics');
  expect(challenge.challengeType).toBe(CHALLENGE_TYPES.ETHICAL_DILEMMA);
});
```

#### New Test (After):

```javascript
test('should generate challenge with correct type', async () => {
  const challenge = await generateChallenge('user@example.com', 'AI Ethics');
  expect(challenge.challengeTypeCode).toBe('ethical-dilemma');
  expect(challenge.getChallengeTypeName()).toBe('Ethical Dilemma');
});
```

## Verifying the Migration

After completing the migration:

1. Run the test scripts:
   ```bash
   npm run test:challenge-model
   npm run test:dynamic-challenge-types
   ```

2. Test the challenge generation:
   ```bash
   node test-challenge-generation.js
   ```

3. Verify the database contains the correct records:
   ```bash
   node check-supabase-data.js
   ```

## Rollback Plan

If issues are encountered, you can roll back using:

1. Revert code changes using Git
2. Run the rollback database migrations:
   ```bash
   node run-migration.js rollback_challenge_tables.sql
   ```

## Best Practices for the New Model

1. **Use Domain Model Methods**: Always use Challenge class methods for validation and data transformation.
2. **Leverage Relationships**: Utilize parent-child relationships for specialized challenge types.
3. **Store Metadata**: Use the metadata fields to store type-specific information.
4. **Validate Early**: Call `isValid()` before saving challenges to ensure data integrity.
5. **Use Repository Layer**: Access challenge types through the repository layer, not direct constants.

## Common Issues and Solutions

1. **Challenge Not Found**: Ensure you're using the correct type codes (kebab-case).
2. **Invalid Challenge**: Check all required fields are populated.
3. **Parent Type Not Found**: Verify parent types exist before creating child types.
4. **Missing Type Metadata**: Ensure type metadata is properly populated when needed. 