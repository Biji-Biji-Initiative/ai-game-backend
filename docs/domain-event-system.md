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

### Handlers

Handlers listen for specific event types and execute business logic in response. A single event can have multiple handlers across different domains.

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

## Common Event Types

Our system defines several standard event types for cross-domain communication:

### Challenge Domain Events

- `ChallengeCreated`: A new challenge has been created
- `ChallengeCompleted`: A user has completed a challenge
- `ChallengeEvaluated`: A user's challenge response has been evaluated

### Focus Area Domain Events

- `FocusAreaCreated`: A new focus area has been created
- `FocusAreaPrioritized`: A focus area's priority has changed
- `FocusAreaCompleted`: A user has mastered a focus area

### User Domain Events

- `UserRegistered`: A new user has registered
- `UserProfileUpdated`: A user has updated their profile
- `UserTraitsAnalyzed`: A user's personality traits have been analyzed

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
    await domainEvents.publish('ChallengeCompleted', {
      challengeId: challenge.id,
      userId,
      score: evaluation.score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses
    });
    
    return evaluation;
  } catch (error) {
    logger.error('Error completing challenge', { userId, challengeId, error });
    throw error;
  }
}
```

## Benefits of Domain Events

1. **Loose Coupling**: Domains don't need direct references to each other
2. **Scalability**: Easy to add new behaviors without modifying existing code
3. **Testability**: Components can be tested in isolation
4. **Audit Trail**: Events provide a history of what happened in the system
5. **Single Responsibility**: Each handler focuses on a specific task

## Best Practices

1. **Name Events in Past Tense**: Events represent something that already happened
2. **Include All Necessary Data**: Events should be self-contained
3. **Keep Handlers Small and Focused**: Each handler should do one thing well
4. **Make Events Immutable**: Event data should not be modified after creation
5. **Use Semantic Event Names**: Names should clearly describe what happened

## Debugging and Monitoring

The Domain Event system includes built-in logging and history tracking:

```javascript
// Get recent events for debugging
const recentEvents = domainEvents.getEventHistory({ limit: 10 });

// Filter events by type
const challengeEvents = domainEvents.getEventHistory({ 
  eventType: 'ChallengeCompleted' 
});
```

## Example: Cross-Domain Integration

This example shows how the Challenge and Focus Area domains can communicate via events:

```javascript
// In the application startup code
domainEvents.registerHandler('ChallengeCompleted', async (event) => {
  const { data } = event;
  
  // Update focus area progress when a challenge is completed
  if (data.focusArea) {
    const focusAreaService = require('./focusArea/services/focusAreaProgressService');
    await focusAreaService.updateProgress(data.userId, data.focusArea, data.score);
  }
});
```

This allows the Focus Area domain to react to events in the Challenge domain without creating a direct dependency. 