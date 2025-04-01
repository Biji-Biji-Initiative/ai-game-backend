import { supabaseClient } from "#app/core/infra/db/supabaseClient.js";
import { logger } from "#app/core/infra/logging/logger.js";
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