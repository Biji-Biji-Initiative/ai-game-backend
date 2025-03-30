# Mapper Best Practices

## Overview

This document outlines best practices for implementing mappers in our application architecture. Mappers are responsible for transforming data between domain entities and their persistence representation. Properly designed and implemented mappers help maintain clean boundaries between the domain and infrastructure layers.

## Core Principles

1. **Single Responsibility**: Mappers should only be responsible for conversion between domain and persistence formats.
2. **Robustness**: Mappers must handle unexpected input formats, null values, and type mismatches gracefully.
3. **Error Handling**: Mappers should log errors appropriately but prevent them from crashing the application.
4. **Data Integrity**: Mappers should ensure that required data is present and in the correct format.
5. **Exception Policy**: Mappers should follow a consistent policy for throwing vs. handling exceptions.

## Implementation Guidelines

### 1. Structure and Organization

- Place mappers in their domain's `mappers` directory (e.g., `src/core/user/mappers/`)
- Follow naming convention: `{DomainEntity}Mapper.js`
- Implement as singleton instances (export an instance, not the class)
- Define four core methods: `toDomain`, `toPersistence`, `toDomainCollection`, and `toPersistenceCollection`

### 2. Handling Null/Undefined Values

- Always check if input is null/undefined before processing
- Provide sensible defaults for missing values
- Return null when input is null for single object conversions
- Return empty arrays when input is null for collection conversions

```javascript
toDomain(data) {
    if (!data) {
        mapperLogger.debug('Attempted to convert null/undefined data to entity');
        return null;
    }
    // Conversion logic...
}
```

### 3. Type Conversion Helpers

Implement helper methods for common type conversions:

- **Date Conversion**: Convert strings to Date objects safely
- **JSON Parsing**: Parse JSON strings to objects safely
- **Array Conversion**: Convert various inputs to arrays safely

```javascript
// Example helper methods
_safeDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    
    try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        mapperLogger.warn(`Failed to convert value to date: ${value}`, { error: error.message });
        return null;
    }
}

_safeJsonParse(value, defaultValue = {}) {
    if (!value) return defaultValue;
    if (typeof value !== 'string') return value;
    
    try {
        return JSON.parse(value);
    } catch (error) {
        mapperLogger.warn(`Failed to parse JSON`, { error: error.message });
        return defaultValue;
    }
}

_safeArray(value, defaultValue = []) {
    if (!value) return defaultValue;
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            return value.split(',').map(item => item.trim()).filter(Boolean);
        }
    }
    
    return [value];
}
```

### 4. Error Logging

- Create a domain-specific logger for each mapper
- Log both warnings (non-critical issues) and errors (conversion failures)
- Include useful context in log messages (IDs, data excerpts, error details)
- Limit logging of large data structures to prevent log pollution

```javascript
// Example logger setup
import { logger } from "../../infra/logging/logger.js";
const mapperLogger = logger.child({ component: 'UserMapper' });

// Example error logging
mapperLogger.error('Failed to convert database record to domain entity', {
    error: error.message,
    id: data.id,
    stack: error.stack
});
```

### 5. Collection Handling

- Process collections item by item to prevent a single failure from affecting all items
- Skip problematic items rather than failing the entire collection
- Log skipped items for later investigation

```javascript
toDomainCollection(dataArray) {
    if (!Array.isArray(dataArray)) {
        mapperLogger.debug('Attempted to convert non-array data to domain collection');
        return [];
    }
    
    const results = [];
    for (let i = 0; i < dataArray.length; i++) {
        try {
            const entity = this.toDomain(dataArray[i]);
            if (entity) {
                results.push(entity);
            }
        } catch (error) {
            mapperLogger.warn(`Failed to convert item at index ${i}, skipping`, {
                error: error.message,
                item: dataArray[i]?.id
            });
            // Continue processing other items
        }
    }
    return results;
}
```

### 6. Schema Validation

- Use schema validation (e.g., Zod) when available to ensure data integrity
- Provide meaningful error messages when validation fails
- Include validation context in logs

```javascript
// Example with schema validation
const validationResult = entitySchema.safeParse(data);
if (!validationResult.success) {
    mapperLogger.warn('Invalid entity data', {
        errors: validationResult.error.message,
        entityId: data.id
    });
    throw new Error(`Invalid entity data: ${validationResult.error.message}`);
}
```

### 7. Case Conversion

- Handle snake_case to camelCase conversion explicitly
- Provide defaults for all fields to avoid undefined values

```javascript
// Example of case conversion with defaults
const entityData = {
    id: data.id || null,
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    emailAddress: data.email_address || '',
    // ...other fields
};
```

## Example Implementation

Here's a template for a robust mapper implementation:

```javascript
import Entity from "../models/Entity.js";
import { logger } from "../../infra/logging/logger.js";

const mapperLogger = logger.child({ component: 'EntityMapper' });

class EntityMapper {
    // Helper methods
    _safeDate(value) { /* ... */ }
    _safeJsonParse(value, defaultValue = {}) { /* ... */ }
    _safeArray(value, defaultValue = []) { /* ... */ }
    
    // Single item conversions
    toDomain(data) {
        if (!data) return null;
        
        try {
            // Conversion logic with defensive coding
            // ...
            return new Entity(entityData);
        } catch (error) {
            mapperLogger.error('Conversion to domain failed', { error });
            throw new Error(`EntityMapper.toDomain failed: ${error.message}`);
        }
    }
    
    toPersistence(entity) {
        if (!entity) return null;
        
        try {
            // Conversion logic with defensive coding
            // ...
            return dbData;
        } catch (error) {
            mapperLogger.error('Conversion to persistence failed', { error });
            throw new Error(`EntityMapper.toPersistence failed: ${error.message}`);
        }
    }
    
    // Collection conversions
    toDomainCollection(items) { /* ... */ }
    toPersistenceCollection(entities) { /* ... */ }
}

export default new EntityMapper();
```

## Common Pitfalls to Avoid

1. **Direct Property Access Without Checks**: Always check if properties exist before accessing them
2. **Assuming Type Consistency**: Don't assume input data will always have the expected types
3. **Ignoring Collection Items**: Don't discard all items when one fails to convert
4. **Excessive Logging**: Be selective about what and how much data you log
5. **Inconsistent Error Handling**: Follow the established pattern for error handling
6. **Complex Logic**: Keep mappers focused on data conversion, not business logic

## Testing Mappers

- Test both success and failure scenarios
- Include tests for edge cases like null/undefined inputs, malformed data, etc.
- Test collection methods with mixed valid and invalid items
- Mock dependencies appropriately

By following these guidelines, we'll ensure that our mappers are robust, maintainable, and consistent across the application. 