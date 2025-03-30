# Value Object Usage Guide

## Standards for Value Object Usage

This guide establishes the standard patterns for using Value Objects (VOs) throughout the codebase.

### Core Principles

1. **Consistent Method Signatures**: All public methods should accept either primitives or Value Objects.
2. **Early Conversion**: Convert parameters to Value Objects at the beginning of methods.
3. **Explicit Validation**: Validate Value Objects and throw domain-specific errors.
4. **Pass-Through**: Pass Value Objects directly to underlying services when possible.

## Standard Implementation Pattern

### For Public Service Methods

```javascript
/**
 * Get a user by email
 * @param {string|Email} emailOrEmailVO - User email or Email value object
 * @returns {Promise<User|null>} User object or null if not found
 */
getUserByEmail(emailOrEmailVO) {
  // 1. Convert to Value Object if needed
  const emailVO = emailOrEmailVO instanceof Email 
    ? emailOrEmailVO 
    : createEmail(emailOrEmailVO);
  
  // 2. Validate and throw domain-specific error
  if (!emailVO) {
    throw new UserValidationError(`Invalid email format: ${emailOrEmailVO}`);
  }
  
  // 3. Use the Value Object in implementation
  // (Pass directly to repository if it supports VOs)
  return this.userRepository.findByEmail(emailVO);
}
```

### For Repository Methods

Repository methods should accept Value Objects directly and extract the primitive value internally:

```javascript
/**
 * Find a user by email
 * @param {Email} emailVO - Email value object
 * @returns {Promise<User|null>} User object or null if not found
 */
findByEmail(emailVO) {
  return this._withRetry(async () => {
    const { data } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('email', emailVO.value)
      .maybeSingle();
      
    // Rest of implementation
  });
}
```

### For Coordinators

Coordinators should maintain Value Objects throughout the entire call chain:

```javascript
/**
 * Get user activity
 * @param {string|Email} emailOrEmailVO - User email or Email value object
 * @returns {Promise<Object>} User activity data
 */
getUserActivity(emailOrEmailVO) {
  return this.executeOperation(async () => {
    // 1. Convert to Value Object if needed
    const emailVO = emailOrEmailVO instanceof Email 
      ? emailOrEmailVO 
      : createEmail(emailOrEmailVO);
    
    // 2. Validate and throw domain-specific error
    if (!emailVO) {
      throw new AppError(`Invalid email format: ${emailOrEmailVO}`, 400);
    }
    
    // 3. Pass Value Object directly to service
    const user = await this.userService.getUserByEmail(emailVO);
    
    // 4. Continue with implementation using user
    // ...
  });
}
```

## When to Use Value Objects

Value Objects should be used for:

1. **Domain Identifiers**: User IDs, Challenge IDs, etc.
2. **Domain Values with Validation**: Email addresses, focus areas, difficulty levels
3. **Domain Values with Behavior**: Anything that has domain-specific rules or operations

## Implementation Guidelines

1. **Method Signatures**: Document both types in JSDoc (e.g., `@param {string|Email}`)
2. **Conversion Pattern**: Always use `paramVO = param instanceof ValueObjectClass ? param : createValueObject(param)`
3. **Validation**: Always validate the Value Object exists before using it
4. **Method Naming**: For backward compatibility, consider adding `xxxByXxxVO` methods 
5. **Repository Pattern**: Repositories should accept Value Objects directly

## Example Implementations

### Primitive to Value Object Conversion

```javascript
const emailVO = email instanceof Email ? email : createEmail(email);
if (!emailVO) {
  throw new UserValidationError(`Invalid email format: ${email}`);
}
```

### Service Method with VO Support

```javascript
getUserByEmail(emailOrEmailVO) {
  const emailVO = emailOrEmailVO instanceof Email 
    ? emailOrEmailVO 
    : createEmail(emailOrEmailVO);
    
  if (!emailVO) {
    throw new UserValidationError(`Invalid email format: ${emailOrEmailVO}`);
  }
  
  return this.repository.findByEmail(emailVO);
}
```

### Repository Method with VO Support

```javascript
findByEmail(emailVO) {
  // Implementation using emailVO.value
}
```

## Benefits of This Pattern

1. **Consistent Type Handling**: Standardized approach throughout the codebase
2. **Simplified Validation**: Value Objects handle their own validation
3. **Domain Model Integrity**: Better representation of domain concepts
4. **Improved Testability**: Easier to test with mock Value Objects
5. **Reduced Duplication**: Less repetitive validation code

By following these guidelines, we ensure that Value Objects are used consistently throughout the codebase, leveraging their full capabilities for validation, type safety, and domain modeling. 