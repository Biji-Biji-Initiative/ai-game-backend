# ERR-2: Implement Dead Letter Queue for Event Bus

## Problem Statement

Currently, when event handlers fail to process events, these events are simply logged as errors and then lost. This presents several issues:

1. **Lost Events**: Critical domain events may never be processed, leading to inconsistent system state
2. **Invisible Failures**: Failed event processing is only visible in logs, not in the application state
3. **No Retry Mechanism**: There's no way to retry processing failed events
4. **Limited Observability**: It's difficult to track and monitor failed events over time

## Solution Approach

We'll implement a Dead Letter Queue (DLQ) mechanism for the event bus with the following features:

1. **Failed Event Storage**: Store failed events in a database table
2. **Failure Context**: Capture error information and context for better debugging
3. **Retry Capability**: Allow manual or automatic retrying of failed events
4. **Admin Interface**: Provide endpoints to view and manage failed events

## Implementation Steps

### 1. Create Database Schema for Dead Letter Queue

First, we'll create a database table to store failed events:

```sql
CREATE TABLE IF NOT EXISTS event_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL,
  handler_id TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  correlation_id TEXT,
  source_id TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_dlq_event_name ON event_dead_letter_queue(event_name);
CREATE INDEX IF NOT EXISTS idx_event_dlq_status ON event_dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_event_dlq_created_at ON event_dead_letter_queue(created_at);
```

### 2. Create Dead Letter Queue Service

Next, we'll create a service to manage the dead letter queue:

```javascript
// src/core/common/events/DeadLetterQueueService.js
import { supabaseClient } from "../../infra/database/supabaseClient.js";
import { logger } from "../../infra/logging/logger.js";
import { v4 as uuidv4 } from 'uuid';

/**
 * Dead Letter Queue Service
 * 
 * Manages failed events by storing them in the database and providing
 * capabilities for viewing, retrying, and managing them.
 */
class DeadLetterQueueService {
  /**
   * Create a new DeadLetterQueueService
   * @param {Object} options - Configuration options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.db = options.db || supabaseClient;
    this.logger = options.logger || logger.child({ component: 'dead-letter-queue' });
    this.tableName = 'event_dead_letter_queue';
  }

  /**
   * Store a failed event in the dead letter queue
   * @param {Object} params - Failed event details
   * @param {Object} params.event - Original event that failed
   * @param {string} params.handlerId - ID of the handler that failed
   * @param {Error} params.error - Error that occurred
   * @returns {Promise<Object>} Stored DLQ entry
   */
  async storeFailedEvent({ event, handlerId, error }) {
    try {
      const dlqEntry = {
        id: uuidv4(),
        event_id: event.id,
        event_name: event.name,
        event_data: event.data || {},
        handler_id: handlerId,
        error_message: error.message,
        error_stack: error.stack,
        retry_count: 0,
        status: 'pending',
        correlation_id: event.correlationId,
        source_id: event.sourceId,
        created_at: new Date().toISOString()
      };

      this.logger.info(`Storing failed event in DLQ: ${event.name}`, {
        eventId: event.id,
        handlerId
      });

      const { data, error: dbError } = await this.db
        .from(this.tableName)
        .insert(dlqEntry)
        .select()
        .single();

      if (dbError) {
        this.logger.error(`Failed to store event in DLQ: ${dbError.message}`, {
          eventId: event.id,
          error: dbError
        });
        return null;
      }

      return data;
    } catch (storeError) {
      this.logger.error(`Error storing failed event in DLQ: ${storeError.message}`, {
        error: storeError,
        stack: storeError.stack,
        eventId: event?.id
      });
      return null;
    }
  }

  /**
   * Get all failed events from the dead letter queue
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status (pending, retrying, resolved)
   * @param {string} options.eventName - Filter by event name
   * @param {number} options.limit - Maximum number of events to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} List of DLQ entries
   */
  async getFailedEvents(options = {}) {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.eventName) {
        query = query.eq('event_name', options.eventName);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to get failed events: ${error.message}`, { error });
        return [];
      }

      return data;
    } catch (queryError) {
      this.logger.error(`Error getting failed events: ${queryError.message}`, {
        error: queryError,
        stack: queryError.stack
      });
      return [];
    }
  }

  /**
   * Retry a failed event
   * @param {string} dlqEntryId - ID of the DLQ entry to retry
   * @param {Object} eventBus - Event bus to use for retry
   * @returns {Promise<boolean>} True if retry was successful
   */
  async retryEvent(dlqEntryId, eventBus) {
    try {
      // Get the DLQ entry
      const { data: dlqEntry, error: getError } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', dlqEntryId)
        .single();

      if (getError || !dlqEntry) {
        this.logger.error(`Failed to get DLQ entry for retry: ${getError?.message || 'Not found'}`, {
          dlqEntryId,
          error: getError
        });
        return false;
      }

      // Create event envelope for retrying
      const eventEnvelope = {
        id: dlqEntry.event_id,
        name: dlqEntry.event_name,
        data: dlqEntry.event_data,
        timestamp: new Date().toISOString(),
        correlationId: dlqEntry.correlation_id,
        sourceId: dlqEntry.source_id,
        isRetry: true,
        originalFailure: {
          handlerId: dlqEntry.handler_id,
          errorMessage: dlqEntry.error_message,
          failedAt: dlqEntry.created_at
        }
      };

      // Update the retry count and status
      const { error: updateError } = await this.db
        .from(this.tableName)
        .update({
          retry_count: dlqEntry.retry_count + 1,
          last_retry_at: new Date().toISOString(),
          status: 'retrying'
        })
        .eq('id', dlqEntryId);

      if (updateError) {
        this.logger.error(`Failed to update DLQ entry for retry: ${updateError.message}`, {
          dlqEntryId,
          error: updateError
        });
      }

      // Publish the event for retry
      this.logger.info(`Retrying failed event: ${dlqEntry.event_name}`, {
        dlqEntryId,
        eventId: dlqEntry.event_id,
        retryCount: dlqEntry.retry_count + 1
      });

      try {
        await eventBus.publish(dlqEntry.event_name, dlqEntry.event_data, {
          correlationId: dlqEntry.correlation_id,
          sourceId: dlqEntry.source_id
        });

        // Update the status to resolved on successful retry
        await this.db
          .from(this.tableName)
          .update({
            status: 'resolved',
          })
          .eq('id', dlqEntryId);

        return true;
      } catch (retryError) {
        // Update the DLQ entry with the new error
        await this.db
          .from(this.tableName)
          .update({
            error_message: retryError.message,
            error_stack: retryError.stack,
            status: 'failed'
          })
          .eq('id', dlqEntryId);

        this.logger.error(`Retry failed for event: ${dlqEntry.event_name}`, {
          dlqEntryId,
          eventId: dlqEntry.event_id,
          error: retryError.message,
          stack: retryError.stack
        });

        return false;
      }
    } catch (error) {
      this.logger.error(`Error during event retry process: ${error.message}`, {
        dlqEntryId,
        error,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Retry all failed events matching criteria
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status
   * @param {string} options.eventName - Filter by event name
   * @param {Object} eventBus - Event bus to use for retry
   * @returns {Promise<Object>} Results of the retry operation
   */
  async retryEvents(options, eventBus) {
    const entries = await this.getFailedEvents(options);
    
    const results = {
      total: entries.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const entry of entries) {
      const success = await this.retryEvent(entry.id, eventBus);
      
      results.details.push({
        id: entry.id,
        eventName: entry.event_name,
        success
      });

      if (success) {
        results.successful++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Delete a DLQ entry
   * @param {string} dlqEntryId - ID of the DLQ entry to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteEntry(dlqEntryId) {
    try {
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('id', dlqEntryId);

      if (error) {
        this.logger.error(`Failed to delete DLQ entry: ${error.message}`, {
          dlqEntryId,
          error
        });
        return false;
      }

      this.logger.info(`Deleted DLQ entry: ${dlqEntryId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting DLQ entry: ${error.message}`, {
        dlqEntryId,
        error,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Mark a DLQ entry as resolved
   * @param {string} dlqEntryId - ID of the DLQ entry to resolve
   * @returns {Promise<boolean>} True if resolution was successful
   */
  async resolveEntry(dlqEntryId) {
    try {
      const { error } = await this.db
        .from(this.tableName)
        .update({
          status: 'resolved'
        })
        .eq('id', dlqEntryId);

      if (error) {
        this.logger.error(`Failed to resolve DLQ entry: ${error.message}`, {
          dlqEntryId,
          error
        });
        return false;
      }

      this.logger.info(`Resolved DLQ entry: ${dlqEntryId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error resolving DLQ entry: ${error.message}`, {
        dlqEntryId,
        error,
        stack: error.stack
      });
      return false;
    }
  }
}

// Create a singleton instance
const deadLetterQueueService = new DeadLetterQueueService();

export { deadLetterQueueService };
```

### 3. Extend RobustEventBus to Support Dead Letter Queue

Modify the RobustEventBus class to store failed events in the dead letter queue:

```javascript
// src/core/common/events/RobustEventBus.js
import { EventEmitter } from 'events';
import { logger } from "../../infra/logging/logger.js";
import { deadLetterQueueService } from "./DeadLetterQueueService.js";

class RobustEventBus {
  constructor(options = {}) {
    // Existing constructor code...
    
    // Add DLQ options
    this.useDLQ = options.useDLQ !== false;
    this.dlqService = options.dlqService || deadLetterQueueService;
  }

  on(eventName, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }
    const handlerId = options.handlerId || `${eventName}-handler-${Date.now()}`;

    // Wrap handler with error handling, logging, and DLQ support
    const wrappedHandler = async eventData => {
      const startTime = Date.now();
      try {
        this.logger.debug(`Executing event handler for ${eventName}`, {
          handlerId
        });
        await Promise.resolve(handler(eventData));
        const duration = Date.now() - startTime;

        // Record metrics
        if (!this.metrics.processingTimes[eventName]) {
          this.metrics.processingTimes[eventName] = [];
        }
        this.metrics.processingTimes[eventName].push(duration);
        
        this.logger.debug(`Handler completed for ${eventName}`, {
          handlerId,
          duration
        });
      } catch (error) {
        this.metrics.failedEvents++;
        this.logger.error(`Error in event handler for ${eventName}`, {
          handlerId,
          error: error.message,
          stack: error.stack,
          eventData,
          duration: Date.now() - startTime
        });

        // Store failed event in dead letter queue if enabled
        if (this.useDLQ && this.dlqService) {
          await this.dlqService.storeFailedEvent({
            event: eventData,
            handlerId,
            error
          });
        }

        // Re-emit the error but don't crash
        this.emitter.emit('error', error);
      }
    };

    // Attach the handler ID to the function for later reference
    wrappedHandler.handlerId = handlerId;

    // Register the handler
    if (options.once) {
      this.emitter.once(eventName, wrappedHandler);
    } else {
      this.emitter.on(eventName, wrappedHandler);
    }
    
    this.logger.debug(`Registered handler for event: ${eventName}`, {
      handlerId
    });
    
    return this;
  }
  
  // Other existing methods...
  
  /**
   * Retry a failed event from the dead letter queue
   * @param {string} dlqEntryId - ID of the DLQ entry to retry
   * @returns {Promise<boolean>} True if retry was successful
   */
  async retryFromDLQ(dlqEntryId) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot retry event');
      return false;
    }
    
    return this.dlqService.retryEvent(dlqEntryId, this);
  }
  
  /**
   * Retry all failed events matching criteria
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Results of the retry operation
   */
  async retryFailedEvents(options = {}) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot retry events');
      return { total: 0, successful: 0, failed: 0, details: [] };
    }
    
    return this.dlqService.retryEvents(options, this);
  }
  
  /**
   * Get failed events from the dead letter queue
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of DLQ entries
   */
  async getFailedEvents(options = {}) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot get failed events');
      return [];
    }
    
    return this.dlqService.getFailedEvents(options);
  }
}

// Update the singleton instance to use DLQ by default
const robustEventBus = new RobustEventBus({
  useDLQ: true,
  recordHistory: true
});

export { robustEventBus };
```

### 4. Create API Endpoints for DLQ Management

Create admin API endpoints to manage the dead letter queue:

```javascript
// src/core/infra/http/routes/eventBusRoutes.js
import express from 'express';
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import { robustEventBus } from "../../../common/events/RobustEventBus.js";
import { deadLetterQueueService } from "../../../common/events/DeadLetterQueueService.js";
import { logger } from "../../../infra/logging/logger.js";

'use strict';

/**
 * Event Bus Routes
 * Provides monitoring and management endpoints for the event bus
 */
export default function eventBusRoutes() {
  const router = express.Router();
  
  // Apply authentication and admin middleware to all routes
  router.use(authenticateUser);
  router.use(requireAdmin);
  
  /**
   * GET /events/metrics
   * Get event bus metrics
   */
  router.get('/metrics', (req, res) => {
    const metrics = robustEventBus.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  });
  
  /**
   * GET /events/dlq
   * Get failed events from the dead letter queue
   */
  router.get('/dlq', async (req, res) => {
    try {
      const { status, eventName, limit, offset } = req.query;
      
      const options = {};
      if (status) options.status = status;
      if (eventName) options.eventName = eventName;
      if (limit) options.limit = parseInt(limit, 10);
      if (offset) options.offset = parseInt(offset, 10);
      
      const failedEvents = await robustEventBus.getFailedEvents(options);
      
      res.json({
        success: true,
        data: failedEvents
      });
    } catch (error) {
      logger.error('Failed to get DLQ events', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get DLQ events'
      });
    }
  });
  
  /**
   * POST /events/dlq/:id/retry
   * Retry a specific failed event
   */
  router.post('/dlq/:id/retry', async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await robustEventBus.retryFromDLQ(id);
      
      res.json({
        success,
        message: success ? 'Event retry initiated' : 'Failed to retry event'
      });
    } catch (error) {
      logger.error('Failed to retry DLQ event', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retry event'
      });
    }
  });
  
  /**
   * POST /events/dlq/retry-all
   * Retry all failed events matching criteria
   */
  router.post('/dlq/retry-all', async (req, res) => {
    try {
      const { status, eventName } = req.body;
      
      const options = {};
      if (status) options.status = status;
      if (eventName) options.eventName = eventName;
      
      const results = await robustEventBus.retryFailedEvents(options);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Failed to retry DLQ events', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retry events'
      });
    }
  });
  
  /**
   * DELETE /events/dlq/:id
   * Delete a specific failed event
   */
  router.delete('/dlq/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await deadLetterQueueService.deleteEntry(id);
      
      res.json({
        success,
        message: success ? 'Event deleted from DLQ' : 'Failed to delete event'
      });
    } catch (error) {
      logger.error('Failed to delete DLQ event', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete event'
      });
    }
  });
  
  /**
   * PUT /events/dlq/:id/resolve
   * Mark a failed event as resolved without retrying
   */
  router.put('/dlq/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await deadLetterQueueService.resolveEntry(id);
      
      res.json({
        success,
        message: success ? 'Event marked as resolved' : 'Failed to resolve event'
      });
    } catch (error) {
      logger.error('Failed to resolve DLQ event', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to resolve event'
      });
    }
  });
  
  return router;
}
```

### 5. Register Routes with Express App

Add the DLQ management routes to the Express app:

```javascript
// src/app.js
import eventBusRoutes from "./core/infra/http/routes/eventBusRoutes.js";

// Add event bus routes to the API
app.use('/api/events', eventBusRoutes());
```

### 6. Adding a Database Migration

Create a migration for the Dead Letter Queue table:

```javascript
// migrations/20230501_create_dead_letter_queue.js
export async function up(knex) {
  return knex.schema.createTable('event_dead_letter_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('event_id').notNullable();
    table.text('event_name').notNullable();
    table.jsonb('event_data').notNullable().defaultTo('{}');
    table.text('handler_id').notNullable();
    table.text('error_message').notNullable();
    table.text('error_stack');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('last_retry_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.text('status').defaultTo('pending');
    table.text('correlation_id');
    table.text('source_id');
    
    table.index('event_name');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex) {
  return knex.schema.dropTable('event_dead_letter_queue');
}
```

### 7. Create Simple DLQ Management UI Component

Create a simple UI component for the admin dashboard:

```javascript
// UI Component (React example)
function DeadLetterQueueManager() {
  const [dlqEntries, setDlqEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: 'pending' });
  
  const fetchDlqEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/events/dlq?' + new URLSearchParams(filter));
      const data = await response.json();
      if (data.success) {
        setDlqEntries(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch DLQ entries', error);
    } finally {
      setLoading(false);
    }
  };
  
  const retryEvent = async (id) => {
    try {
      const response = await fetch(`/api/events/dlq/${id}/retry`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        fetchDlqEntries();
      }
    } catch (error) {
      console.error('Failed to retry event', error);
    }
  };
  
  useEffect(() => {
    fetchDlqEntries();
  }, [filter]);
  
  return (
    <div className="dlq-manager">
      <h2>Dead Letter Queue</h2>
      
      <div className="filters">
        <select 
          value={filter.status} 
          onChange={e => setFilter({...filter, status: e.target.value})}
        >
          <option value="pending">Pending</option>
          <option value="retrying">Retrying</option>
          <option value="failed">Failed</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </select>
        
        <button onClick={fetchDlqEntries} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <table className="dlq-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Error</th>
            <th>Created At</th>
            <th>Retry Count</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dlqEntries.map(entry => (
            <tr key={entry.id}>
              <td>{entry.event_name}</td>
              <td>{entry.error_message}</td>
              <td>{new Date(entry.created_at).toLocaleString()}</td>
              <td>{entry.retry_count}</td>
              <td>{entry.status}</td>
              <td>
                <button 
                  onClick={() => retryEvent(entry.id)}
                  disabled={entry.status === 'resolved'}
                >
                  Retry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {dlqEntries.length === 0 && (
        <p>No failed events found.</p>
      )}
    </div>
  );
}
```

## Key Changes

### New Components

1. **Dead Letter Queue Service**: A service to store and manage failed events
2. **DLQ Database Table**: A table to persist failed events
3. **Admin API Endpoints**: Routes to view and manage failed events
4. **DLQ Management UI**: A simple UI component for the admin dashboard

### Modified Components

1. **RobustEventBus**: Extended to store failed events in the DLQ and provide retry functionality
2. **App Configuration**: Updated to register the new routes

## Benefits

1. **Improved Reliability**: No critical events are lost, even when handlers fail
2. **Better Debugging**: Failed events are stored with full context for easier debugging
3. **Recovery Mechanism**: Ability to retry failed events after issues are fixed
4. **Operational Visibility**: Admins can monitor and manage failed events through UI

## Testing Strategy

1. **Unit Tests**: Test the Dead Letter Queue Service functions
2. **Integration Tests**: Test event publishing and DLQ storage
3. **Failure Scenario Tests**: Simulate handler failures and verify DLQ functionality
4. **API Endpoint Tests**: Test all REST endpoints for DLQ management 