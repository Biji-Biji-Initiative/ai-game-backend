# Value Object Standardization

## Description

This PR standardizes the use of Value Objects in the specified files according to the patterns defined in `src/core/common/VALUE_OBJECT_USAGE_GUIDE.md`.

## Changes

- Renamed parameters to use the `OrVO` suffix for methods accepting both primitives and value objects
- Implemented the standard conversion pattern at the beginning of methods
- Added explicit validation and error handling for value objects
- Updated JSDoc to properly document parameter types
- Removed unnecessary `.value` extractions

## Files Updated

- [ ] `file1.js`
- [ ] `file2.js`
- [ ] `file3.js`

## Implementation Checklist

For each method that uses value objects:

- [ ] Renamed parameters (e.g., `email` → `emailOrEmailVO`)
- [ ] Updated parameter JSDoc to show both types (e.g., `@param {string|Email}`)
- [ ] Added the standard conversion pattern:
    ```javascript
    const emailVO = emailOrEmailVO instanceof Email 
        ? emailOrEmailVO 
        : createEmail(emailOrEmailVO);
    ```
- [ ] Added explicit validation with domain-specific errors:
    ```javascript
    if (!emailVO) {
        throw new DomainValidationError(`Invalid email: ${emailOrEmailVO}`);
    }
    ```
- [ ] Pass value objects directly to service methods where possible
- [ ] Use `.value` only when necessary (e.g., when interfacing with repositories that don't accept VOs)

## Testing

- [ ] Ran the `valueObjectAudit.js` script to verify improvements
- [ ] Manually verified that all methods handle both primitives and value objects correctly
- [ ] Ran relevant unit and integration tests

## Related Issues

Resolves: #M1 (Standardize Value Object Usage) 