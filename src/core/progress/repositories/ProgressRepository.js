'use strict';

/**
 * Progress Repository
 *
 * Handles data access operations for Progress domain model.
 * Extends BaseRepository for consistent error handling and database operations.
 */

const Progress = require('../models/Progress');
const { supabaseClient } = require('../../core/infra/db/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { eventBus } = require('../../common/events/domainEvents');

const {
  BaseRepository,
  EntityNotFoundError,
  ValidationError,
  DatabaseError,
} = require('../../core/infra/repositories/BaseRepository');

// Import domain-specific error classes
const {
  ProgressError,
  ProgressNotFoundError,
  ProgressValidationError,
  ProgressRepositoryError
} = require('../errors/ProgressErrors');

const {
  createErrorMapper,
  createErrorCollector
} = require('../../../core/infra/errors/errorStandardization');

const progressMapper = require('../mappers/ProgressMapper');

// Create an error mapper for the progress domain
const progressErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: ProgressNotFoundError,
    ValidationError: ProgressValidationError,
    DatabaseError: ProgressRepositoryError
  },
  ProgressError
);

/**
 * Repository for progress data access
 * @extends BaseRepository
 */
class ProgressRepository extends BaseRepository {
  /**
   * Create a new ProgressRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.eventBus - Event bus for domain events
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'user_progress',
      domainName: 'progress',
      logger: options.logger,
      maxRetries: 3,
    });

    this.eventBus = options.eventBus || eventBus;
    this.validateUuids = true;

    // Apply standardized error handling to methods
    this.findById = this._wrapWithErrorHandling('findById');
    this.findByUserId = this._wrapWithErrorHandling('findByUserId');
    this.findByUserAndChallenge = this._wrapWithErrorHandling('findByUserAndChallenge');
    this.save = this._wrapWithErrorHandling('save');
    this.findAllByUserId = this._wrapWithErrorHandling('findAllByUserId');
    this.delete = this._wrapWithErrorHandling('delete');
  }

  /**
   * Helper method to wrap repository methods with standardized error handling
   * @param {string} methodName - Name of the method to wrap
   * @returns {Function} Wrapped method
   * @private
   */
  _wrapWithErrorHandling(methodName) {
    const originalMethod = this[methodName];
    
    return async (...args) => {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        this.logger.error(`Error in progress repository ${methodName}`, {
          error: error.message,
          stack: error.stack,
          methodName,
          args: JSON.stringify(
            args.map(arg => {
              // Don't log potentially large objects/arrays in full
              if (typeof arg === 'object' && arg !== null) {
                return Object.keys(arg);
              }
              return arg;
            })
          ),
        });

        // Map error to domain-specific error
        const mappedError = progressErrorMapper(error, {
          methodName,
          domainName: 'progress',
          args,
        });
        throw mappedError;
      }
    };
  }

  /**
   * Find a progress record by ID
   * @param {string} id - Progress ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findById(id) {
    this._validateId(id);

    return await this._withRetry(
      async () => {
        this._log('debug', 'Finding progress by ID', { id });

        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          throw new DatabaseError(`Failed to retrieve progress: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findById',
            metadata: { id },
          });
        }

        if (!data) {
          this._log('debug', 'Progress not found', { id });
          return null;
        }

        // Use mapper to convert database record to domain entity
        return progressMapper.toDomain(data);
      },
      'findById',
      { id }
    );
  }

  /**
   * Find a user's progress
   * @param {string} userId - User ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findByUserId(userId) {
    this._validateRequiredParams({ userId }, ['userId']);

    return await this._withRetry(
      async () => {
        this._log('debug', 'Finding progress by user ID', { userId });

        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          throw new DatabaseError(`Failed to fetch progress by user ID: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findByUserId',
            metadata: { userId },
          });
        }

        if (!data) {
          this._log('debug', 'Progress not found for user', { userId });
          return null;
        }

        // Use mapper to convert database record to domain entity
        return progressMapper.toDomain(data);
      },
      'findByUserId',
      { userId }
    );
  }

  /**
   * Find a user's progress for a specific challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findByUserAndChallenge(userId, challengeId) {
    this._validateRequiredParams({ userId, challengeId }, ['userId', 'challengeId']);

    return await this._withRetry(
      async () => {
        this._log('debug', 'Finding progress for challenge', { userId, challengeId });

        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('user_id', userId)
          .eq('challenge_id', challengeId)
          .maybeSingle();

        if (error) {
          throw new DatabaseError(`Failed to fetch progress for challenge: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findByUserAndChallenge',
            metadata: { userId, challengeId },
          });
        }

        if (!data) {
          this._log('debug', 'Progress not found for challenge', { userId, challengeId });
          return null;
        }

        // Use mapper to convert database record to domain entity
        return progressMapper.toDomain(data);
      },
      'findByUserAndChallenge',
      { userId, challengeId }
    );
  }

  /**
   * Save a progress record to the database (create or update)
   * @param {Progress} progress - Progress object to save
   * @returns {Promise<Progress>} Updated progress object
   * @throws {ProgressValidationError} If progress data is invalid
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async save(progress) {
    if (!progress) {
      throw new ValidationError('Progress object is required', {
        entityType: this.domainName,
      });
    }

    if (!(progress instanceof Progress)) {
      throw new ValidationError('Object must be a Progress instance', {
        entityType: this.domainName,
      });
    }

    // Validate progress before saving
    const validation = progress.validate();
    if (!validation.isValid) {
      throw new ValidationError(`Invalid progress data: ${validation.errors.join(', ')}`, {
        entityType: this.domainName,
        validationErrors: validation.errors,
      });
    }

    // Collect domain events for publishing after successful save
    const domainEvents = progress.getDomainEvents ? progress.getDomainEvents() : [];
    
    // Clear the events from the entity to prevent double-publishing
    if (domainEvents.length > 0 && progress.clearDomainEvents) {
      progress.clearDomainEvents();
    }

    return await this._withRetry(
      async () => {
        // Set created_at and updated_at if not already set
        const now = new Date().toISOString();
        if (!progress.createdAt) {
          progress.createdAt = now;
        }
        progress.updatedAt = now;

        // Generate ID if not present (for new records)
        if (!progress.id) {
          progress.id = uuidv4();
        }

        // Convert to database format using mapper
        const progressData = progressMapper.toPersistence(progress);

        this._log('debug', 'Saving progress record', {
          id: progress.id,
          userId: progress.userId,
          isNew: !progress.createdAt,
        });

        // Upsert progress data
        const { data, error } = await this.db
          .from(this.tableName)
          .upsert(progressData)
          .select()
          .single();

        if (error) {
          throw new DatabaseError(`Failed to save progress: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save',
            metadata: { id: progress.id, userId: progress.userId },
          });
        }

        this._log('debug', 'Progress record saved successfully', { id: data.id });

        // Convert database record to domain entity using mapper
        const savedProgress = progressMapper.toDomain(data);
        
        // Create an error collector for non-critical operations
        const errorCollector = createErrorCollector();
        
        // Publish collected domain events AFTER successful persistence
        if (domainEvents.length > 0) {
          try {
            this._log('debug', 'Publishing collected domain events', {
              id: savedProgress.id,
              eventCount: domainEvents.length
            });
            
            // Publish the events one by one in sequence (maintaining order)
            for (const event of domainEvents) {
              await this.eventBus.publish(event.type, event.data);
            }
          } catch (eventError) {
            // Collect but don't throw errors from event publishing
            errorCollector.collect(eventError, 'event_publishing');
            this._log('error', 'Error publishing domain events', { 
              id: savedProgress.id, 
              error: eventError.message 
            });
          }
        }

        return savedProgress;
      },
      'save',
      { id: progress.id }
    );
  }

  /**
   * Find all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Progress>>} Array of Progress objects
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async findAllByUserId(userId) {
    this._validateRequiredParams({ userId }, ['userId']);

    return await this._withRetry(
      async () => {
        this._log('debug', 'Finding all progress for user', { userId });

        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('user_id', userId);

        if (error) {
          throw new DatabaseError(`Failed to fetch all progress for user: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findAllByUserId',
            metadata: { userId },
          });
        }

        this._log('debug', `Found ${data?.length || 0} progress records for user`, { userId });

        // Convert database records to domain entities using mapper
        return progressMapper.toDomainCollection(data || []);
      },
      'findAllByUserId',
      { userId }
    );
  }

  /**
   * Delete a progress record
   * @param {string} id - Progress ID
   * @returns {Promise<boolean>} True if successful
   * @throws {ProgressRepositoryError} If database operation fails
   */
  async delete(id) {
    this._validateId(id);

    return await this._withRetry(
      async () => {
        this._log('debug', 'Deleting progress record', { id });

        // Check if record exists before deleting
        const existing = await this.findById(id);
        if (!existing) {
          throw new EntityNotFoundError(`Progress with ID ${id} not found`, {
            entityId: id,
            entityType: this.domainName,
          });
        }
        
        // Create a domain event for deletion
        if (existing.addDomainEvent) {
          existing.addDomainEvent('ProgressDeleted', {
            progressId: id,
            userId: existing.userId,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Collect domain events for publishing after successful deletion
        const domainEvents = existing.getDomainEvents ? existing.getDomainEvents() : [];
        
        // Clear the events from the entity to prevent double-publishing
        if (domainEvents.length > 0 && existing.clearDomainEvents) {
          existing.clearDomainEvents();
        }

        const { error } = await this.db.from(this.tableName).delete().eq('id', id);

        if (error) {
          throw new DatabaseError(`Failed to delete progress: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'delete',
            metadata: { id },
          });
        }

        this._log('debug', 'Progress record deleted successfully', { id });
        
        // Create an error collector for non-critical operations
        const errorCollector = createErrorCollector();
        
        // Publish domain events AFTER successful deletion
        if (domainEvents.length > 0) {
          try {
            this._log('debug', 'Publishing collected domain events', {
              id,
              eventCount: domainEvents.length
            });
            
            // Publish the events one by one in sequence (maintaining order)
            for (const event of domainEvents) {
              await this.eventBus.publish(event.type, event.data);
            }
          } catch (eventError) {
            // Collect but don't throw errors from event publishing
            errorCollector.collect(eventError, 'event_publishing');
            this._log('error', 'Error publishing domain events', { 
              id, 
              error: eventError.message 
            });
          }
        }

        return true;
      },
      'delete',
      { id }
    );
  }
}

module.exports = ProgressRepository;
