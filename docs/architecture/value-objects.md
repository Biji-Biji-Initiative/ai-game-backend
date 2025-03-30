# Value Objects

This document explains how Value Objects are used in our application and how to work with them effectively.

## Overview

Value Objects are immutable objects that represent a concept in our domain by their attributes, not by their identity. In our application, Value Objects are used to ensure type safety, validation, and encapsulation of business rules related to specific values.

Examples of Value Objects in our system include:

- `Email` - Represents a valid email address
- `UserId` - Represents a user identifier
- `ChallengeId` - Represents a challenge identifier
- `FocusArea` - Represents a focus area for challenges
- `DifficultyLevel` - Represents a difficulty level
- `TraitScore` - Represents a personality trait score

## Key Characteristics

Value Objects have several important characteristics:

1. **Immutability**: They cannot be changed after creation
2. **Equality Based on Attributes**: Two value objects with the same attributes are considered equal
3. **No Identity**: They don't have a unique identifier
4. **Self-Validation**: They validate their own data
5. **Domain Behavior**: They encapsulate business rules related to their values

## Implementation

A typical Value Object implementation follows this pattern:

```javascript
// Email Value Object
export class Email {
  constructor(value) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format');
    }
    this._value = value;
    Object.freeze(this); // Ensure immutability
  }
  
  get value() {
    return this._value;
  }
  
  isValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  equals(other) {
    return other instanceof Email && this._value === other._value;
  }
  
  toString() {
    return this._value;
  }
}
```

## Working with Value Objects

### Creation

Value Objects provide strong validation. When creating them, the constructor throws an error if the input is invalid:

```javascript
import { Email } from "../core/common/valueObjects/Email.js";

try {
  // May throw if email is invalid
  const emailVO = new Email("user@example.com");
  // Safe to use the value object
} catch (error) {
  console.error("Invalid email:", error.message);
}
```

### Factory Functions

For situations where you want to avoid exceptions, we provide factory functions:

```javascript
import { createEmail } from "../core/common/valueObjects/index.js";

// Returns null if email is invalid (no exception)
const emailVO = createEmail("user@example.com");
if (emailVO) {
  // Safe to use the value object
} else {
  console.log("Email was invalid");
}
```

### The ensureVO Utility

To standardize the pattern of accepting either a primitive value or a value object, we use the `ensureVO` utility function:

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

### Comparing Value Objects

Value Objects are compared by their attributes, not by reference:

```javascript
const email1 = new Email("user@example.com");
const email2 = new Email("user@example.com");
const email3 = new Email("different@example.com");

email1.equals(email2); // true - same value
email1.equals(email3); // false - different value
email1 === email2;     // false - different instances
```

### Using Value Objects in Domain Entities

Value Objects should be used as properties of domain entities to enforce validation and encapsulate business rules:

```javascript
class User {
  constructor(id, props) {
    this.id = id;
    this.email = ensureVO(props.email, Email, createEmail);
    
    if (!this.email) {
      throw new Error("Invalid email for user");
    }
    
    // Other properties...
  }
  
  // Domain methods...
}
```

## Available Value Objects

| Value Object | Factory Function | Purpose |
|--------------|------------------|---------|
| Email | createEmail | Represents a valid email address |
| UserId | createUserId | Represents a user identifier |
| ChallengeId | createChallengeId | Represents a challenge identifier |
| FocusArea | createFocusArea | Represents a focus area for challenges |
| DifficultyLevel | createDifficultyLevel | Represents a difficulty level |
| TraitScore | createTraitScore | Represents a personality trait score |
| PercentageValue | createPercentage | Represents a percentage (0-100) |
| DateRange | createDateRange | Represents a date range with start and end |

## Value Object Collections

For collections of value objects, we use specialized collection classes:

```javascript
class TraitScoreCollection {
  constructor(traitScores) {
    this._items = [...traitScores];
    Object.freeze(this._items);
    Object.freeze(this);
  }
  
  get items() {
    return [...this._items];
  }
  
  getScoreByTrait(traitName) {
    return this._items.find(score => score.traitName === traitName);
  }
  
  getAverageScore() {
    if (this._items.length === 0) return 0;
    const sum = this._items.reduce((total, score) => total + score.value, 0);
    return sum / this._items.length;
  }
}
```

## Best Practices

1. **Always Use Factory Functions for External Input**: When accepting input from external sources (API, database), use factory functions to handle invalid values gracefully.

2. **Enforce Immutability**: Make sure value objects are truly immutable by using `Object.freeze()` or similar techniques.

3. **Implement equals() Method**: Always implement a proper equality method that compares attributes.

4. **Use Value Objects for Validation**: Let value objects handle validation logic for their specific types.

5. **Keep Value Objects Small and Focused**: Each value object should represent a single concept.

6. **Use ensureVO for Parameters**: When accepting values that could be primitives or Value Objects, use the ensureVO utility.

7. **Document Validation Rules**: Clearly document the validation rules for each value object.

8. **Use Value Objects in Domain Decision Logic**: Leverage value objects' methods to implement domain rules.

## Testing Value Objects

When testing value objects, focus on:

1. **Validation**: Test that invalid values are rejected
2. **Equality**: Test that equality works correctly
3. **Immutability**: Test that objects cannot be modified after creation
4. **Business Rules**: Test any domain-specific logic in the value object

Example test:

```javascript
describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const email = new Email('user@example.com');
    expect(email.value).to.equal('user@example.com');
  });
  
  it('should throw for invalid email format', () => {
    expect(() => new Email('invalid-email')).to.throw('Invalid email format');
  });
  
  it('should be immutable', () => {
    const email = new Email('user@example.com');
    expect(() => { email.value = 'another@example.com'; }).to.throw();
  });
  
  it('should correctly compare equality', () => {
    const email1 = new Email('user@example.com');
    const email2 = new Email('user@example.com');
    const email3 = new Email('another@example.com');
    
    expect(email1.equals(email2)).to.be.true;
    expect(email1.equals(email3)).to.be.false;
  });
  
  it('should convert to string properly', () => {
    const email = new Email('user@example.com');
    expect(email.toString()).to.equal('user@example.com');
  });
});
```

## Conclusion

Value Objects are a powerful tool in our domain-driven design approach. By using them consistently, we improve code quality through better validation, encapsulation of business rules, and improved type safety. Make sure to leverage value objects for all domain values that have validation rules or specific semantics. 