# API Types System

This directory contains the centralized type system for API integration. It provides TypeScript types, Zod schemas, and helper functions for working with API data.

## Overview

The type system is based on:

1. **Zod Schemas**: Generated from the OpenAPI specification
2. **TypeScript Types**: Inferred from the Zod schemas
3. **UI Types**: Extended from API types with UI-specific properties
4. **Helper Functions**: For mapping between API and UI types

## How to Use

### Importing Types

```typescript
// Import basic API types
import { User, Challenge, Evaluation } from '@/types/api';

// Import UI-specific types
import { UIChallenge } from '@/types/api';

// Import schemas for validation
import { schemas } from '@/types/api';

// Import helper functions
import { mapToUIChallenge, validateChallenge } from '@/types/api';
```

### Working with API Data

When fetching data from the API:

```typescript
// In a service file
import { Challenge, mapToUIChallenge } from '@/types/api';

// Fetch data from API
const apiData = await fetchChallengeFromAPI();

// Validate the data (optional but recommended)
const isValid = schemas.Challenge.safeParse(apiData);
if (!isValid.success) {
  console.error('Invalid API data:', isValid.error);
  return;
}

// Map API data to UI format
const uiChallenge = mapToUIChallenge(apiData);

// Use in components
return uiChallenge;
```

### In React Components

```typescript
// In a React component
import { UIChallenge } from '@/types/api';

interface Props {
  challenge: UIChallenge;
}

const ChallengeCard: React.FC<Props> = ({ challenge }) => {
  // Now you have access to both API fields and UI-specific fields
  return (
    <div>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      <span>{challenge.difficulty}</span>
      {challenge.tags && challenge.tags.map(tag => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
};
```

## Adding New Types

To add a new API type:

1. First, ensure it exists in the OpenAPI specification
2. After regenerating the Zodios client, add it to the `index.ts` file:

```typescript
// In types/api/index.ts
export type NewType = z.infer<typeof schemas.NewType>;

// If UI-specific fields are needed:
export interface UINewType extends NewType {
  uiSpecificField: string;
}

// Add mapping function
export function mapToUINewType(data: NewType): UINewType {
  return {
    ...data,
    uiSpecificField: 'Derived value'
  };
}
```

## Best Practices

1. **Always validate** API data with schemas before using it
2. **Use mapping functions** consistently for UI conversions
3. **Don't mix** API types and UI types - be explicit about which you're using
4. **Document** any UI-specific fields and their purpose
5. **Keep UI logic** in the mapping functions, not scattered through components

## Troubleshooting

- **Missing fields**: If a field is missing from the type, check the OpenAPI specification
- **Type errors**: Ensure you're using the right type (API vs UI)
- **Validation errors**: Log the error using `console.log(result.error.format())` to see details 