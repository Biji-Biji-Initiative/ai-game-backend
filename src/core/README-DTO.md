# Data Transfer Object (DTO) Pattern

## Overview

This document explains our use of the Data Transfer Object (DTO) pattern to create a clean separation between our domain layer and the API contract. DTOs help us create a stable API while allowing our domain model to evolve independently.

## What are DTOs?

Data Transfer Objects are simple objects that:
- Carry data between processes or layers
- Have no behavior except for storage, retrieval, serialization and deserialization
- Define the exact data structure that will be sent over the API
- Decouple the API contract from internal domain models

## Why Use DTOs?

1. **API Contract Stability**
   - Domain models can change without breaking API clients
   - Domain model implementation details remain hidden
   - API versioning becomes more manageable

2. **Security**
   - Only expose necessary data (avoid leaking sensitive fields)
   - Prevent accidental exposure of internal properties
   - Control exactly what goes over the wire

3. **Customization**
   - Add API-specific fields not present in domain models
   - Format data specifically for client needs
   - Merge data from multiple domain objects into a single response

4. **Performance**
   - Transfer only the data needed for specific use cases
   - Reduce payload size by omitting unnecessary fields

## How We Implement DTOs

### 1. DTO Classes

We create dedicated DTO classes for each domain entity that's exposed through the API:

```javascript
class ChallengeDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.content = data.content || '';
    // Only include properties needed for the API
    // Omit internal implementation details
    
    // Add API-specific computed properties
    this.isEvaluated = data.status === 'evaluated';
  }
  
  // Serialization methods
  toJSON() {
    // Format data for API representation
  }
}
```

### 2. DTO Mappers

We use mapper classes to convert between domain entities and DTOs:

```javascript
class ChallengeDTOMapper {
  static toDTO(challenge, options = {}) {
    // Convert from domain entity to DTO
    return new ChallengeDTO({
      id: challenge.id,
      content: challenge.content,
      // Map only necessary fields
    });
  }
  
  static fromRequest(requestBody) {
    // Convert from API request to domain parameters
    // Validate and sanitize input
  }
}
```

### 3. Controller Usage

Controllers use DTOs for all API communication:

```javascript
async getChallengeById(req, res) {
  // Get domain entity
  const challenge = await this.challengeService.getChallengeById(id);
  
  // Convert to DTO before sending response
  const challengeDto = ChallengeDTOMapper.toDTO(challenge);
  
  res.status(200).json({
    success: true,
    data: challengeDto
  });
}
```

## Guidelines for Creating DTOs

1. **Keep DTOs Simple**
   - No business logic or behavior
   - Only data and serialization methods

2. **Naming Conventions**
   - Suffix with `DTO` to clearly identify the class purpose
   - Match API endpoint purposes (e.g., `ChallengeResponseDTO` for challenge responses)

3. **DTO Structure**
   - Include only fields needed by API clients
   - Use clear, client-friendly property names
   - Consider adding computed properties for client convenience

4. **Validation**
   - Validate and sanitize data when converting from API requests
   - Handle missing or malformed data gracefully

## Evolution of DTOs

As the API evolves:

1. Create new DTO versions when breaking changes are needed
2. Keep backward compatibility when possible
3. Document field deprecation before removal
4. Consider versioning in the API path for significant changes

## Examples

See these files for implementation examples:
- `src/core/challenge/dtos/ChallengeDTO.js`
- `src/core/challenge/controllers/ChallengeController.js` 