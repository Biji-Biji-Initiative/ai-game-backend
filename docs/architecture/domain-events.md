# Domain Event System

This document outlines the Domain Event system implemented as part of our Domain-Driven Design (DDD) architecture, explaining how it enables loose coupling between domains while maintaining communication.

## Overview

The Domain Event system follows the Observer pattern to allow different domains to communicate without direct dependencies. This promotes modular design, easier testing, and a more maintainable codebase.

## Core Concepts

### Events

Domain Events are notifications that something important has happened in a domain. They:

- Represent something that occurred in the past (e.g., `ChallengeCompleted`)
- Carry all the data needed to understand what happened
- Are immutable
- Help domains react to changes in other domains

### Publishers

Publishers are the source of events. When something significant happens in a domain, it publishes an event to notify interested parties.

### Subscribers/Handlers

Handlers (or subscribers) listen for specific event types and execute business logic in response. A single event can have multiple handlers across different domains.

## Event Structure

Each domain event includes:

1. **Type**: A unique event type identifier (e.g., `USER_CREATED`)
2. **Payload**: The event data
3. **Metadata**: Additional event metadata (timestamp, source, etc.)

## Implementation

Our Domain Event system is implemented in `src/core/shared/domainEvents.js` and provides a simple yet powerful event bus:

### Registration

```javascript
// Register a handler for a specific event type
const handlerId = domainEvents.registerHandler('ChallengeCompleted', async (event) => {
  const { data } = event;
  // Handle the challenge completion event
  await updateUserProgress(data.userId, data.challengeId, data.score);
});
```

### Event Publishing

```javascript
// Publish an event when a challenge is completed
await domainEvents.publish('ChallengeCompleted', {
  challengeId: challenge.id,
  userId: challenge.userId,
  score: evaluation.score,
  completedAt: new Date().toISOString()
});
```

### Handler Removal

```javascript
// Remove a handler when it's no longer needed
domainEvents.unregisterHandler(handlerId);
```

## Core Domain Events

### User Domain

#### `USER_CREATED`

Published when a new user is created.

**Publisher**: User Service

**Payload**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Subscribers**:
- Personality Domain: Creates a new personality profile for the user
- Progress Domain: Initializes user progress tracking
- User Journey Domain: Creates a new user journey

#### `USER_UPDATED`

Published when a user's profile is updated.

**Publisher**: User Service

**Payload**:
```json
{
  "userId": "user-id", 
  "changes": {
    "name": "Updated Name"
  },
  "previousValues": {
    "name": "Original Name"
  }
}
```

#### `USER_FOCUS_AREA_CHANGED`

Published when a user changes their focus area.

**Publisher**: User Service

**Payload**:
```json
{
  "userId": "user-id",
  "focusArea": "productivity",
  "previousFocusArea": "creativity"
}
```

### Challenge Domain Events

#### `CHALLENGE_CREATED`

Published when a new challenge is created.

**Publisher**: Challenge Service

**Payload**:
```json
{
  "challengeId": "challenge-id",
  "userId": "user-id",
  "focusArea": "AI Ethics",
  "difficulty": "intermediate",
  "createdAt": "2023-09-15T14:30:00Z"
}
```

#### `CHALLENGE_COMPLETED`

Published when a user completes a challenge.

**Publisher**: Challenge Service

**Payload**:
```json
{
  "challengeId": "challenge-id",
  "userId": "user-id",
  "score": 85,
  "strengths": ["critical-thinking", "ethical-reasoning"],
  "weaknesses": ["technical-understanding"],
  "completedAt": "2023-09-16T10:45:00Z"
}
```

### Personality Domain Events

#### `PERSONALITY_TRAITS_UPDATED`

Published when a user's personality traits are updated.

**Publisher**: Personality Service

**Payload**:
```json
{
  "userId": "user-id",
  "personalityTraits": {
    "analytical": 80,
    "creative": 75
  },
  "dominantTraits": ["analytical", "creative"]
}
```

## Integration with Service Layer

Services act as event publishers when significant domain events occur:

```javascript
// In challengeService.js
async function completeChallenge(userId, challengeId, response) {
  try {
    // Domain logic to complete the challenge
    const challenge = await challengeRepository.findById(challengeId);
    const evaluation = await evaluationService.evaluateResponse(challenge, response);
    
    // Update the challenge status
    challenge.complete(evaluation.score);
    await challengeRepository.save(challenge);
    
    // Publish the domain event
    await domainEvents.publish('CHALLENGE_COMPLETED', {
      challengeId: challenge.id,
      userId,
      score: evaluation.score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      completedAt: new Date().toISOString()
    });
    
    return evaluation;
  } catch (error) {
    logger.error('Error completing challenge', { userId, challengeId, error });
    throw error;
  }
}
```

## Example: Cross-Domain Integration

This example shows how the Challenge and Focus Area domains can communicate via events:

```javascript
// In the application startup code
domainEvents.registerHandler('CHALLENGE_COMPLETED', async (event) => {
  const { data } = event;
  
  // Update focus area progress when a challenge is completed
  if (data.focusArea) {
    const focusAreaService = require('./focusArea/services/focusAreaProgressService');
    await focusAreaService.updateProgress(data.userId, data.focusArea, data.score);
  }
});
```

This allows the Focus Area domain to react to events in the Challenge domain without creating a direct dependency.

## Benefits of Domain Events

1. **Loose Coupling**: Domains don't need direct references to each other
2. **Scalability**: Easy to add new behaviors without modifying existing code
3. **Testability**: Components can be tested in isolation
4. **Audit Trail**: Events provide a history of what happened in the system
5. **Single Responsibility**: Each handler focuses on a specific task

## Best Practices

1. **Immutability**: Event payloads should be treated as immutable
2. **Idempotency**: Event handling should be idempotent (can be processed multiple times without side effects)
3. **Name Events in Past Tense**: Events represent something that already happened
4. **Include All Necessary Data**: Events should be self-contained
5. **Keep Handlers Small and Focused**: Each handler should do one thing well
6. **Use Semantic Event Names**: Names should clearly describe what happened
7. **Minimal Payloads**: Include only the data needed by subscribers
8. **Error Handling**: Implement robust error handling in event subscribers

## Debugging and Monitoring

The Domain Event system includes built-in logging and history tracking:

```javascript
// Get recent events for debugging
const recentEvents = domainEvents.getEventHistory({ limit: 10 });

// Filter events by type
const challengeEvents = domainEvents.getEventHistory({ 
  eventType: 'CHALLENGE_COMPLETED' 
});
``` 