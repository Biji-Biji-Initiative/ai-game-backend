# Event Handler Implementation Example

This document provides examples for implementing event handlers that work with our standardized domain event structure.

## Basic Event Handler Example

```javascript
/**
 * Event handler for USER_CREATED events
 * @param {Object} event - The standardized event object
 * @param {string} event.id - Unique event ID
 * @param {string} event.type - Event type (e.g., 'USER_CREATED')
 * @param {Object} event.data - Event data
 * @param {string} event.data.entityId - ID of the entity (user) that triggered the event
 * @param {string} event.data.entityType - Type of entity (e.g., 'User')
 * @param {Object} event.metadata - Event metadata
 * @param {string} event.metadata.correlationId - Correlation ID for tracking event chains
 * @param {string} event.metadata.timestamp - ISO timestamp of when the event occurred
 */
function handleUserCreated(event) {
  const { id, type, data, metadata } = event;
  const { entityId, entityType } = data;
  const { correlationId, timestamp } = metadata;
  
  console.log(`Handling ${type} event (ID: ${id})`);
  console.log(`User ${entityId} was created at ${timestamp}`);
  console.log(`Correlation ID: ${correlationId}`);
  
  // Access additional event-specific data from data property
  if (data.email) {
    console.log(`User email: ${data.email}`);
  }
  
  // Perform the actual business logic in response to the event
  // For example, sending a welcome email to the user
}

// Register the event handler with the event bus
eventBus.on('USER_CREATED', handleUserCreated);
```

## Error Handling Example

```javascript
/**
 * Event handler with robust error handling
 */
async function handleUserOnboardingCompleted(event) {
  try {
    const { data, metadata } = event;
    const { entityId, entityType } = data;
    
    logger.info(`Processing onboarding completion for user ${entityId}`, {
      eventId: event.id,
      correlationId: metadata.correlationId
    });
    
    // Perform business logic here
    await userService.setupDefaultPreferences(entityId);
    await notificationService.sendWelcomeNotification(entityId);
    
    logger.info(`Successfully processed onboarding for user ${entityId}`, {
      eventId: event.id,
      correlationId: metadata.correlationId
    });
  } catch (error) {
    // Log the error with the event context
    logger.error(`Failed to process user onboarding event`, {
      eventId: event.id,
      correlationId: event.metadata?.correlationId,
      error: error.message,
      stack: error.stack,
      entityId: event.data?.entityId
    });
    
    // Optionally re-throw if the event bus should handle it
    // (e.g., for sending to Dead Letter Queue)
    throw error;
  }
}
```

## Migration Example

If you're migrating from the old event structure to the new one, you might need to handle both formats temporarily:

```javascript
/**
 * Event handler that supports both old and new event formats
 */
function handleFocusAreaAssigned(event) {
  // Support both the new standardized structure and legacy format
  const userId = event.data?.entityId || event.userId;
  const focusAreaId = event.data?.focusAreaId || event.focusAreaId;
  const timestamp = event.metadata?.timestamp || event.timestamp || new Date().toISOString();
  
  if (!userId || !focusAreaId) {
    logger.warn('Received malformed FocusAreaAssigned event', { event });
    return;
  }
  
  logger.info(`Focus area ${focusAreaId} assigned to user ${userId}`, {
    eventId: event.id,
    timestamp
  });
  
  // Proceed with business logic using the extracted data
  // ...
}
```

## Best Practices

1. **Destructure Event Properties**: Use destructuring to clearly identify the event properties you need.
2. **Include Event Context in Logs**: Always include event ID and correlation ID in log entries.
3. **Proper Error Handling**: Wrap handlers in try/catch blocks and provide detailed error context.
4. **Single Responsibility**: Each handler should focus on a specific business concern.
5. **Idempotent Operations**: Event handlers should be idempotent to handle potential duplicate events.
6. **Decoupled Logic**: Keep handler logic independent from other handlers to avoid cascading failures.

## Using Event Metadata

The standardized event format includes useful metadata you can leverage:

```javascript
function handleUserStatusChanged(event) {
  const { data, metadata } = event;
  
  // Use correlation ID for tracing
  const traceContext = { correlationId: metadata.correlationId };
  
  // Capture timing information
  const eventTime = new Date(metadata.timestamp);
  const processingDelay = Date.now() - eventTime.getTime();
  
  if (processingDelay > 5000) {
    logger.warn(`Processing event with significant delay: ${processingDelay}ms`, {
      eventId: event.id,
      ...traceContext
    });
  }
  
  // Handle the event based on user's new status
  switch (data.newStatus) {
    case 'active':
      activateUserServices(data.entityId, traceContext);
      break;
    case 'inactive':
      deactivateUserServices(data.entityId, traceContext);
      break;
    // ...handle other status changes
  }
}
``` 