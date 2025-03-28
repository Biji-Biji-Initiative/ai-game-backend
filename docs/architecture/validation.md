# Zod Schema Validation in the Response API

This document explains how schema validation is implemented using Zod across the different domains in the Response API.

## Overview

Zod is used for data validation across the application to ensure data integrity, provide better error messages, and catch issues early. We've implemented schema validation for the following domains:

- Challenge
- Evaluation
- Adaptive
- UserJourney

## Schema Structure

Each domain follows a consistent pattern:

1. Schema files are located in a `schemas` subdirectory within each domain
2. Schemas are imported and used in repositories for validation
3. Both domain models and database formats are validated

### Directory Structure

```
src/core/
├── challenge/
│   ├── models/
│   ├── repositories/
│   └── schemas/           <- Challenge schemas
├── evaluation/
│   ├── models/
│   ├── repositories/
│   └── schemas/           <- Evaluation schemas
├── adaptive/
│   ├── models/
│   ├── repositories/
│   └── schemas/           <- Adaptive schemas
└── userJourney/
    ├── models/
    ├── repositories/
    └── schemas/           <- UserJourney schemas
```

## Schema Types

For each domain, we implement several types of schemas:

1. **Main Entity Schema** - Validates the domain model with camelCase keys
2. **Update Schema** - Partial schema for update operations (making fields optional)
3. **Database Schema** - Validates database format with snake_case keys
4. **Query/Search Schema** - Validates query parameters for repository search methods

## Implementation Details

### Challenge Domain

The Challenge domain includes:
- `ChallengeSchema` - Validates full challenge objects
- `ChallengeUpdateSchema` - For update operations with optional fields
- `ChallengeSearchSchema` - For search criteria validation
- `SearchOptionsSchema` - For pagination and sorting options

### Evaluation Domain

The Evaluation domain includes:
- `EvaluationSchema` - Validates evaluation objects
- `EvaluationUpdateSchema` - For update operations
- `EvaluationSearchOptionsSchema` - For search and filtering options

### Adaptive Domain

The Adaptive domain includes:
- `DifficultySchema` - Validates difficulty settings
- `RecommendationSchema` - Validates recommendation objects
- `RecommendationDatabaseSchema` - For database format validation
- `RecommendationUpdateSchema` - For partial updates

### UserJourney Domain

The UserJourney domain includes:
- `UserJourneyEventSchema` - Validates journey events
- `UserJourneyEventCreateSchema` - For event creation operations
- `UserJourneyEventDatabaseSchema` - For database format
- `UserJourneyEventQuerySchema` - For query/filtering operations

## Usage in Repositories

Each repository should:

1. Import the appropriate schemas
2. Validate input data using `schema.safeParse()`
3. Handle validation errors appropriately
4. Validate database results when fetching data

### Example Usage

```javascript
// Import schema
const { ChallengeSchema } = require('../schemas/ChallengeSchema');

// Validate input data
const validationResult = ChallengeSchema.safeParse(inputData);
if (!validationResult.success) {
  // Handle validation error
  throw new Error(`Validation failed: ${validationResult.error.message}`);
}

// Use validated data
const validData = validationResult.data;
```

## Testing Schemas

Unit tests for schemas are implemented in the corresponding test directories:

```
tests/domain/
├── challenge/schemas/
├── evaluation/schemas/
├── adaptive/schemas/
└── userJourney/schemas/
```

These tests ensure schemas correctly validate valid data and reject invalid data. 