# Parent-Child Relationships in Challenge Types

## Overview

The Challenge system now supports hierarchical relationships between challenge types, allowing for more structured and specific challenge generation.

## Concepts

### Challenge Type Hierarchy

Challenge types can be organized in a hierarchical structure with parent-child relationships:

- **Parent Types**: Broader, more general challenge types (e.g., "critical-thinking")
- **Child Types**: More specific subtypes that inherit properties from parent types (e.g., "logical-fallacy-detection")

This hierarchy enables:
- Inheritance of common properties
- More specific challenge generation
- Better organization of challenge types
- Flexible extension of the system

## Database Structure

The parent-child relationship is stored in the `challenge_types` table:

```sql
CREATE TABLE challenge_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_type_id UUID REFERENCES challenge_types(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_system_defined BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The `parent_type_id` field is a self-reference to the same table, creating the hierarchical relationship.

## Creating Child Challenge Types

### Using the Repository Layer

```javascript
const challengeTypeRepository = require('../repositories/challengeTypeRepository');

// First ensure the parent type exists
const parentTypeId = await challengeTypeRepository.upsertChallengeType({
  code: 'critical-thinking',
  name: 'Critical Thinking',
  description: 'Challenges that test critical thinking abilities'
});

// Create a child type referencing the parent
const childTypeId = await challengeTypeRepository.upsertChallengeType({
  code: 'logical-fallacy-detection',
  name: 'Logical Fallacy Detection',
  description: 'Identify logical fallacies in arguments',
  parentTypeCode: 'critical-thinking',
  metadata: {
    examples: ['ad hominem', 'straw man', 'false dichotomy'],
    difficulty_modifier: 1.2
  }
});
```

### Direct API Example

```javascript
// Create a child challenge type
const createChildType = async () => {
  const response = await fetch('/api/challenge-types', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: 'logical-fallacy-detection',
      name: 'Logical Fallacy Detection',
      description: 'Identify logical fallacies in arguments',
      parentTypeCode: 'critical-thinking'
    })
  });
  
  return await response.json();
};
```

## Retrieving Challenge Types with Hierarchy

When retrieving challenge types, the parent-child relationship information is included:

```javascript
// Get all challenge types with hierarchy information
const getAllTypes = async () => {
  const types = await challengeTypeRepository.getChallengeTypes();
  
  // Build a hierarchy map
  const typeMap = {};
  types.forEach(type => {
    typeMap[type.id] = {
      ...type,
      children: []
    };
  });
  
  // Build parent-child relationships
  types.forEach(type => {
    if (type.parent_type_id && typeMap[type.parent_type_id]) {
      typeMap[type.parent_type_id].children.push(typeMap[type.id]);
    }
  });
  
  // Get root-level types (those without parents)
  const rootTypes = types.filter(type => !type.parent_type_id)
    .map(type => typeMap[type.id]);
    
  return rootTypes;
};
```

## Challenge Generation with Type Hierarchy

When generating challenges, you can specify either a parent type or a specific child type:

```javascript
// Generate a challenge using a specific subtype
const generateSpecificChallenge = async () => {
  const challenge = await challengeService.generateChallenge({
    userEmail: 'user@example.com',
    challengeTypeCode: 'logical-fallacy-detection', // Specific child type
    formatTypeCode: 'multiple-choice',
    difficulty: 'intermediate'
  });
  
  return challenge;
};

// Generate a challenge using a parent type (system will select appropriate subtype)
const generateBroaderChallenge = async () => {
  const challenge = await challengeService.generateChallenge({
    userEmail: 'user@example.com',
    challengeTypeCode: 'critical-thinking', // Parent type
    formatTypeCode: 'multiple-choice',
    difficulty: 'intermediate'
  });
  
  return challenge;
};
```

## Best Practices

1. **Use Meaningful Codes**
   - Parent types should have broader, more general codes
   - Child types should have more specific, descriptive codes
   - Use kebab-case for all type codes (e.g., 'logical-fallacy-detection')

2. **Limit Hierarchy Depth**
   - Generally aim for a maximum of 2-3 levels of hierarchy
   - Deep hierarchies can become hard to manage

3. **Maintain Metadata Consistency**
   - Child types should extend or specialize metadata from parent types
   - Don't completely override parent metadata without good reason

4. **Naming Conventions**
   - Parent types: Broader category names (e.g., "Critical Thinking")
   - Child types: More specific names (e.g., "Logical Fallacy Detection")

## Using Parent-Child Relationships in Prompt Engineering

When generating prompts for challenges, the parent-child relationship can be utilized to provide more context:

```javascript
// Example prompt fragment using type hierarchy
const buildPrompt = (challenge) => {
  let prompt = `Generate a ${challenge.getChallengeTypeName()} challenge`;
  
  // If there's parent type information available
  if (challenge.typeMetadata && challenge.typeMetadata.parentTypeName) {
    prompt += ` in the broader category of ${challenge.typeMetadata.parentTypeName}`;
  }
  
  // Add more specific instructions for this subtype
  if (challenge.typeMetadata && challenge.typeMetadata.specificInstructions) {
    prompt += `\n\nSpecific instructions for this subtype: ${challenge.typeMetadata.specificInstructions}`;
  }
  
  return prompt;
};
```

## Migration from Flat to Hierarchical Structure

If you're migrating from a flat challenge type structure to the hierarchical model:

1. Identify natural parent-child groupings in your existing types
2. Create parent types first
3. Update existing types to reference their parents
4. Optionally, add new child types to expand the taxonomy

## Testing Parent-Child Relationships

See the `test-dynamic-challenge-types.js` file for examples of testing parent-child relationships between challenge types. 