# Enhanced Domain Events Documentation

This document provides detailed examples and guidelines for working with domain events in our system.

## Domain Events Overview

Domain events represent significant occurrences within the domain that other parts of the system might be interested in. They enable loose coupling between domains and support the eventual consistency model.

## Domain Event Structure

All domain events follow a consistent structure:

```javascript
{
  type: 'domain.event.name', // Namespaced event type
  data: {
    // Event-specific data
    entityId: '123', // ID of the entity associated with the event
    entityType: 'Challenge', // Type of the entity
    // Additional event properties
  },
  metadata: {
    timestamp: '2023-04-01T12:00:00Z', // When the event occurred
    actor: 'user-456', // Who triggered the event (user or system)
    correlationId: 'corr-789', // For tracking related events
    causationId: 'cause-101' // ID of the event that caused this one
  }
}
```

## Core Domain Events by Domain

### User Domain

| Event Type | Description | Key Properties | Consumers |
|------------|-------------|----------------|-----------|
| `user.created` | A new user has been created | `userId`, `email` | Auth, UserJourney |
| `user.updated` | User profile has been updated | `userId`, `updatedFields` | UserJourney, Personality |
| `user.focusArea.changed` | User selected a new focus area | `userId`, `focusAreaId`, `previousFocusAreaId` | Challenge, Progress, FocusArea |

### Challenge Domain

| Event Type | Description | Key Properties | Consumers |
|------------|-------------|----------------|-----------|
| `challenge.generated` | A new challenge has been generated | `challengeId`, `userId`, `focusAreaId`, `difficulty` | Progress, UserJourney |
| `challenge.started` | A user started a challenge | `challengeId`, `userId`, `startedAt` | Progress, UserJourney |
| `challenge.responded` | A user submitted a response to a challenge | `challengeId`, `userId`, `responseId` | Evaluation, Progress |
| `challenge.completed` | A challenge has been completed | `challengeId`, `userId`, `score` | Progress, UserJourney, Adaptive |

### Evaluation Domain

| Event Type | Description | Key Properties | Consumers |
|------------|-------------|----------------|-----------|
| `evaluation.completed` | An evaluation of a challenge response is complete | `evaluationId`, `challengeId`, `userId`, `score` | Progress, UserJourney, Adaptive |
| `evaluation.skillLevelUp` | User's skill level increased in an area | `userId`, `skillCategory`, `newLevel`, `previousLevel` | Progress, UserJourney, Adaptive |

### Progress Domain

| Event Type | Description | Key Properties | Consumers |
|------------|-------------|----------------|-----------|
| `progress.milestone.reached` | User reached a learning milestone | `userId`, `milestoneType`, `milestoneValue` | UserJourney, Adaptive |
| `progress.streak.updated` | User's challenge streak updated | `userId`, `currentStreak`, `longestStreak` | UserJourney |

### Personality Domain

| Event Type | Description | Key Properties | Consumers |
|------------|-------------|----------------|-----------|
| `personality.profile.updated` | User's personality profile updated | `userId`, `traits` | Prompt, UserJourney |
| `personality.settings.changed` | User changed personality settings | `userId`, `settings` | Prompt |

## Publishing Domain Events

Domain events are published from domain entities or services:

### From Domain Entities

```javascript
class Challenge extends Entity {
  constructor(id, props) {
    super(id);
    this.title = props.title;
    this.description = props.description;
    this.userId = props.userId;
    this.status = props.status || 'created';
    this._domainEvents = [];
  }
  
  start() {
    if (this.status !== 'created') {
      throw new Error('Challenge can only be started when in created status');
    }
    
    this.status = 'in_progress';
    this.startedAt = new Date();
    
    // Add domain event
    this.addDomainEvent('challenge.started', {
      startedAt: this.startedAt
    });
    
    return this;
  }
  
  complete(score) {
    if (this.status !== 'in_progress') {
      throw new Error('Challenge can only be completed when in progress');
    }
    
    this.status = 'completed';
    this.completedAt = new Date();
    this.score = score;
    
    // Add domain event
    this.addDomainEvent('challenge.completed', {
      completedAt: this.completedAt,
      score: this.score
    });
    
    return this;
  }
  
  addDomainEvent(eventType, eventData = {}) {
    this._domainEvents.push({
      type: eventType,
      data: {
        ...eventData,
        challengeId: this.id,
        userId: this.userId,
        entityId: this.id,
        entityType: 'Challenge'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
  
  getDomainEvents() {
    return [...this._domainEvents];
  }
  
  clearDomainEvents() {
    this._domainEvents = [];
  }
}
```

### Publishing from Repositories

```javascript
class ChallengeRepository {
  constructor({ dbClient, domainEventPublisher }) {
    this.dbClient = dbClient;
    this.domainEventPublisher = domainEventPublisher;
  }
  
  async save(challenge) {
    // Collect domain events before clearing them
    const events = challenge.getDomainEvents();
    challenge.clearDomainEvents();
    
    // Persist to database
    const data = challengeMapper.toPersistence(challenge);
    await this.dbClient.challenges.upsert(data);
    
    // Publish domain events
    if (events.length > 0) {
      await Promise.all(events.map(event => 
        this.domainEventPublisher.publish(event.type, event.data, event.metadata)
      ));
    }
    
    return challenge;
  }
}
```

## Handling Domain Events

Events are handled by subscribers that register interest in specific event types:

```javascript
// In Progress domain
class ProgressEventHandler {
  constructor({ progressService }) {
    this.progressService = progressService;
  }
  
  initialize(eventBus) {
    // Register event handlers
    eventBus.subscribe('challenge.completed', this.handleChallengeCompleted.bind(this));
    eventBus.subscribe('evaluation.completed', this.handleEvaluationCompleted.bind(this));
    eventBus.subscribe('user.focusArea.changed', this.handleFocusAreaChanged.bind(this));
  }
  
  async handleChallengeCompleted(event) {
    const { challengeId, userId, score } = event.data;
    await this.progressService.updateChallengeProgress(userId, challengeId, score);
  }
  
  async handleEvaluationCompleted(event) {
    const { evaluationId, challengeId, userId, score } = event.data;
    await this.progressService.recordEvaluation(userId, challengeId, evaluationId, score);
  }
  
  async handleFocusAreaChanged(event) {
    const { userId, focusAreaId, previousFocusAreaId } = event.data;
    await this.progressService.updateFocusAreaProgress(userId, focusAreaId, previousFocusAreaId);
  }
}
```

## Cross-Domain Communication Patterns

### Immediate Consistency (Synchronous)

For operations requiring immediate consistency, domains can directly call other domain services:

```javascript
// In Challenge domain service
async submitChallengeResponse(userId, challengeId, response) {
  // Core challenge domain logic
  const challenge = await this.challengeRepository.findById(challengeId);
  const savedResponse = await this.saveResponse(challenge, userId, response);
  
  // Directly call evaluation domain (immediate consistency needed)
  const evaluation = await this.evaluationService.evaluateResponse(
    challengeId, 
    userId, 
    savedResponse.id
  );
  
  return {
    responseId: savedResponse.id,
    evaluationId: evaluation.id
  };
}
```

### Eventual Consistency (Asynchronous)

For operations where eventual consistency is acceptable, use domain events:

```javascript
// In Challenge domain entity
submitResponse(responseText) {
  this.response = responseText;
  this.respondedAt = new Date();
  this.status = 'responded';
  
  // Add domain event for eventual processing
  this.addDomainEvent('challenge.responded', {
    responseText: this.response,
    respondedAt: this.respondedAt
  });
  
  return this;
}

// In Evaluation domain event handler
async handleChallengeResponded(event) {
  const { challengeId, userId, responseText } = event.data;
  
  // Schedule evaluation asynchronously
  await this.evaluationService.scheduleEvaluation(challengeId, userId, responseText);
}
```

## Best Practices

1. **Naming Conventions**: Use `domain.entity.action` format for event names (e.g., `user.profile.updated`)

2. **Event Granularity**: Balance between too many fine-grained events and too few coarse-grained events

3. **Event Versioning**: Include version information when events change structure

4. **Idempotent Handlers**: Ensure event handlers are idempotent to handle duplicate events

5. **Event Enrichment**: Include enough information in events to minimize lookups by consumers

6. **Error Handling**: Implement proper error handling and retries in event subscribers

7. **Event Sourcing Compatibility**: Design events to be compatible with event sourcing if implementing it later

8. **Auditing**: Use events for audit logging and traceability of system changes 