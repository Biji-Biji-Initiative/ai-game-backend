# Missing Domains Documentation

This document provides information about domains that exist in the codebase but were not fully documented in the main architecture documentation.

## AI Domain (`/src/core/ai`)

### Overview

The AI domain encapsulates interactions with artificial intelligence services, primarily providing adapters for AI providers like OpenAI and abstract ports for domain services to use.

### Key Components

#### Ports (`/src/core/ai/ports`)

The ports define interfaces that domain services can use without depending on specific AI provider implementations:

- `AIProvider` - Abstract interface for AI services
- `CompletionProvider` - Interface for text completion services
- `EmbeddingProvider` - Interface for text embedding services

#### Adapters (`/src/core/ai/adapters`)

Adapters implement the abstract ports for specific AI providers:

- `OpenAIClientAdapter` - Adapter for OpenAI API
- `MockOpenAIClientAdapter` - Mock implementation for testing

### Usage

Domain services interact with AI capabilities through the port interfaces, not directly with adapters:

```javascript
class ChallengeGenerationService {
  constructor({ aiCompletionProvider, /* other dependencies */ }) {
    this.aiCompletionProvider = aiCompletionProvider;
    // ...
  }
  
  async generateChallenge(params) {
    // Use AI provider through the interface
    const completion = await this.aiCompletionProvider.complete({
      prompt: this.buildPrompt(params),
      maxTokens: 1000
    });
    
    // Process the result
    return this.processAIResponse(completion);
  }
}
```

## Authentication Domain (`/src/core/auth`)

### Overview

The Auth domain handles authentication and authorization concerns, providing controllers and services for user authentication.

### Key Components

#### Controllers (`/src/core/auth/controllers`)

- `AuthController` - Handles authentication-related HTTP requests (login, signup, token refresh)

#### Errors (`/src/core/auth/errors`)

- `AuthErrors` - Custom error types for authentication-related issues

### Integration with Other Domains

The Auth domain primarily interacts with:
- User domain for retrieving and validating user information
- Infrastructure middleware for JWT handling and request authentication

## Common Domain (`/src/core/common`)

### Overview

The Common domain provides shared models, value objects, and utilities used across multiple domains.

### Key Components

#### Value Objects (`/src/core/common/valueObjects`)

- `Email` - Represents and validates email addresses
- `UserId` - Represents user identifiers
- `UUID` - Represents universally unique identifiers
- Other value objects for common data types

#### Models (`/src/core/common/models`)

- Base models and model utilities used across domains

#### Events (`/src/core/common/events`)

- Common domain event types and utilities

### Usage

The Common domain components are imported directly by other domains:

```javascript
import { Email, UserId } from '../../common/valueObjects';
import { BaseEntity } from '../../common/models';

class User extends BaseEntity {
  constructor(id, props) {
    super(id);
    this.email = new Email(props.email);
    // ...
  }
}
```

## Shared Domain (`/src/core/shared`)

### Overview

The Shared domain contains utilities and helpers that are not specific to any domain business logic but provide technical capabilities shared across the application.

### Key Components

- String formatting utilities
- Date/time handling
- Validation helpers
- Common type definitions

### Usage

The Shared domain components are used throughout the application for common technical tasks:

```javascript
import { formatDate, isValidISODate } from '../../shared/dateUtils';
import { stringifyWithCircular } from '../../shared/stringUtils';

// Use shared utilities
const formattedDate = formatDate(new Date(), 'YYYY-MM-DD');
```

## Integration with Architecture

These missing domains fit into the overall architecture as follows:

1. **AI Domain** - Acts as an interface layer between domain services and external AI providers, following the Ports and Adapters pattern

2. **Auth Domain** - Manages authentication concerns, working with the User domain and infrastructure layer to secure the application

3. **Common Domain** - Provides cross-cutting domain model components, following DDD principles for shared value objects and models

4. **Shared Domain** - Offers technical utilities that don't belong in any specific domain but support the entire application

## Architectural Considerations

When working with these domains, follow these guidelines:

1. **AI Domain**:
   - Always interact through the port interfaces, not directly with adapters
   - Use dependency injection to provide the appropriate adapter implementation
   - Handle potential AI service failures gracefully

2. **Auth Domain**:
   - Keep authentication logic separate from domain business logic
   - Use the infrastructure layer's authentication middleware for securing routes

3. **Common Domain**:
   - Ensure value objects are immutable
   - Only include truly cross-cutting domain concerns
   - Avoid putting domain-specific logic in common components

4. **Shared Domain**:
   - Keep utilities focused on technical concerns, not domain logic
   - Ensure utilities are well-tested and robust
   - Document utility functions clearly 