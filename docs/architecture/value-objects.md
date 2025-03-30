# Value Objects

This document explains how Value Objects are used in the AI Fight Club API and how to work with them effectively.

## Overview

Value Objects are immutable objects that represent a concept in our domain by its attributes, not by its identity. In our application, Value Objects are used to ensure type safety, validation, and encapsulation of business rules related to specific values.

Examples of Value Objects in our system include:

- `Email` - Represents a valid email address
- `UserId` - Represents a user identifier
- `ChallengeId` - Represents a challenge identifier
- `FocusArea` - Represents a focus area for challenges
- `DifficultyLevel` - Represents a difficulty level

## Working with Value Objects

### Creation

Value Objects provide strong validation. When creating them, the constructor may throw if the input is invalid:

```javascript
import { Email } from "../core/common/valueObjects/index.js";

// May throw if email is invalid
const emailVO = new Email("user@example.com");
```

To handle failures gracefully, use the factory functions:

```javascript
import { createEmail } from "../core/common/valueObjects/index.js";

// Returns null if email is invalid (no exception)
const emailVO = createEmail("user@example.com");
if (emailVO) {
  // Safe to use the value object
}
```

### Standard Pattern: ensureVO Utility

Many components need to accept either a primitive value or an already-created Value Object. To standardize this pattern, we use the `ensureVO` utility function:

```javascript
import { ensureVO, Email, createEmail } from "../core/common/valueObjects/index.js";

function processUser(userEmail) {
  // Convert to VO if needed
  const emailVO = ensureVO(userEmail, Email, createEmail);
  
  if (!emailVO) {
    throw new Error("Invalid email");
  }
  
  // Now use emailVO safely
}

// Works with either format
processUser("user@example.com");
processUser(new Email("user@example.com"));
```

The `ensureVO` function:
1. Takes any value
2. Checks if it's already an instance of the specified Value Object class
3. If not, tries to create a new Value Object using the provided factory function
4. Returns the Value Object or null if invalid

This standardized approach reduces code duplication and ensures consistent handling across the application.

## Best Practices

1. **Always validate Value Objects**: Check if the value object is valid before using it.

2. **Use ensureVO for parameters**: When accepting values that could be primitives or Value Objects.

3. **Use factory functions for null safety**: The factory functions return null instead of throwing.

4. **Make domain decisions using Value Objects**: Use Value Objects' methods to implement domain rules.

## Available Value Objects

| Value Object | Factory Function | Purpose |
|--------------|------------------|---------|
| Email | createEmail | Represents a valid email address |
| UserId | createUserId | Represents a user identifier |
| ChallengeId | createChallengeId | Represents a challenge identifier |
| FocusArea | createFocusArea | Represents a focus area for challenges |
| DifficultyLevel | createDifficultyLevel | Represents a difficulty level |
| TraitScore | createTraitScore | Represents a personality trait score |

## Implementation

Value Objects are located in the `src/core/common/valueObjects` directory. Each Value Object has:

1. A class file (e.g., `Email.js`) implementing the Value Object
2. A factory function in `index.js` (e.g., `createEmail`)
3. Export from the index file for easy importing 