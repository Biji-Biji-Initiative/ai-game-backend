# Infrastructure Migration Guide

This guide will help you update your code to use the new consolidated infrastructure.

## Step 1: Update Import Paths

Replace old infrastructure imports with the new paths:

| Old Path | New Path |
|----------|----------|
| `../core/infra/...` | `../core/infrastructure/...` |
| `../infra/...` | `../core/infrastructure/...` |
| `../infrastructure/...` | `../core/infrastructure/...` |

### Common Updates:

```javascript
// Database
const { supabaseClient } = require('../../infra/db/supabaseClient');
// ↓ Change to ↓
const { supabaseClient } = require('../../infrastructure/persistence/supabaseClient');

// Logging
const { logger } = require('../../infra/logging/logger');
// ↓ Change to ↓
const { logger } = require('../../infrastructure/logging/logger');

// Error handling
const AppError = require('../../infra/errors/AppError');
// ↓ Change to ↓
const AppError = require('../../infrastructure/errors/AppError');

// OpenAI
const { formatForResponsesApi } = require('../../infra/openai/messageFormatter');
// ↓ Change to ↓
const { formatForResponsesApi } = require('../../infrastructure/openai/messageFormatter');

// Events
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
// ↓ Change to ↓
const { eventTypes, eventBus } = require('../../infrastructure/messaging/domainEvents');
```

## Step 2: Update Case Conventions

1. Use lowercase `eventTypes` instead of `EventTypes`:

```javascript
// Old
if (event.type === EventTypes.USER_CREATED) {
  // ...
}

// New
if (event.type === eventTypes.USER_CREATED) {
  // ...
}
```

2. Make sure constructor parameter names match container registration:

```javascript
// Old
constructor({ 
  EventTypes, 
  // ... 
}) {
  this.EventTypes = EventTypes;
}

// New
constructor({ 
  eventTypes, 
  // ... 
}) {
  this.EventTypes = eventTypes; // Or rename this.EventTypes to this.eventTypes for full consistency
}
```

## Step 3: Dependency Injection

The DI container now supports both `get()` and `resolve()` methods for backward compatibility:

```javascript
// Both work now
const logger = container.get('logger');
const logger = container.resolve('logger');

// Registration is now case-insensitive
container.register('myService', () => new MyService());
const myService = container.get('myservice'); // Works fine
```

## Step 4: Verify Your Changes

1. Run the application locally to ensure it starts without errors
2. Check console output for any "module not found" errors
3. Verify that all routes and functionality work as expected

## Reporting Issues

If you encounter any issues with the migration, please:

1. Check if the needed file exists in the new path structure
2. Update your import paths accordingly
3. If still encountering issues, report with specific error messages and file paths 