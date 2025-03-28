# Database Connection Module

This module provides utilities for database connection management and health checks for the AI Fight Club application.

## Overview

The `databaseConnection.js` module in the infrastructure layer is the canonical implementation for all database connection-related functionality. It provides:

1. **Connection Initialization** - `initializeSupabase()`
2. **Health Checks** - `checkConnection()` and `runDatabaseHealthCheck()`
3. **Supabase Client Access** - `supabaseClient` 

## Usage

Import the module in your code:

```javascript
// Recommended import path
const { 
  initializeSupabase, 
  checkConnection, 
  runDatabaseHealthCheck 
} = require('path/to/core/infra/db/databaseConnection');
```

## Available Functions

### initializeSupabase()

Initializes the Supabase connection and performs a simple query to verify it works.

```javascript
const success = await initializeSupabase();
if (success) {
  console.log('Database connected successfully');
}
```

### checkConnection()

Simple health check that returns a boolean indicating connection status.

```javascript
const isConnected = await checkConnection();
```

### runDatabaseHealthCheck()

Detailed health check that returns an object with connection status, response time, and other metrics.

```javascript
const healthInfo = await runDatabaseHealthCheck();
console.log(healthInfo.status); // 'healthy' or 'error'
console.log(healthInfo.responseTime); // in milliseconds
```

## Architectural Note

As part of the CODE-03 architecture refactoring, the duplicate implementation at `src/core/shared/utils/databaseConnection.js` has been replaced with a compatibility layer that forwards all calls to this implementation.

All new code should directly import from `src/core/infra/db/databaseConnection.js`. 