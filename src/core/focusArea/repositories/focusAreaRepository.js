'use strict';

/**
 * Focus Area Repository
 * Handles database operations for focus areas
 * 
 * @module focusAreaRepository
 * @requires FocusArea
 * @requires BaseRepository
 */

const FocusArea = require('../models/FocusArea');
const { 
  FocusAreaNotFoundError, 
  FocusAreaPersistenceError,
  FocusAreaValidationError
} = require('../errors/focusAreaErrors');
const { eventBus, EventTypes } = require('../../common/events/domainEvents');
const { supabaseClient } = require('../../core/infra/db/supabaseClient');
const { 
  BaseRepository, 
  EntityNotFoundError, 
  ValidationError, 
  DatabaseError 
} = require('../../core/infra/repositories/BaseRepository');
const { _focusAreaSchema } = require('../schemas/focusAreaValidation');

/**
 * Repository for focus area data access
 * @extends BaseRepository
 */
class FocusAreaRepository extends BaseRepository {
  /**
   * Create a new FocusAreaRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.eventBus - Event bus for domain events
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'focus_areas',
      domainName: 'focusArea',
      logger: options.logger,
      maxRetries: 3
    });
    
    this.eventBus = options.eventBus || eventBus;
    this.validateUuids = true;
  }

  /**
   * Find a focus area by its ID
   * @param {string} id - Focus area ID
   * @param {boolean} throwIfNotFound - Whether to throw an error if not found
   * @returns {Promise<FocusArea|null>} Focus area object or null if not found
   * @throws {FocusAreaNotFoundError} If focus area not found and throwIfNotFound is true
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  findById(id, throwIfNotFound = false) {
    try {
      // Validate ID
      this._validateId(id);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Finding focus area by ID', { id });
        
        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .maybeSingle();
  
        if (error) {
          throw new DatabaseError(`Failed to fetch focus area: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findById',
            metadata: { id }
          });
        }
        
        if (!data) {
          this._log('debug', 'Focus area not found', { id });
          
          if (throwIfNotFound) {
            throw new EntityNotFoundError(`Focus area with ID ${id} not found`, {
              entityId: id,
              entityType: this.domainName
            });
          }
          
          return null;
        }
        
        return FocusArea.fromDatabase(data);
      }, 'findById', { id });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof EntityNotFoundError) {
        throw new FocusAreaNotFoundError(id);
      }
      
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // For any other error
      if (!(error instanceof FocusAreaPersistenceError)) {
        this._log('error', 'Error in findById', { 
          id, 
          error: error.message,
          stack: error.stack 
        });
        
        throw new FocusAreaPersistenceError(`Failed to find focus area: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Find focus areas by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @param {boolean} options.activeOnly - Filter by active status
   * @param {string} options.sortBy - Field to sort by
   * @param {string} options.sortDir - Sort direction (asc/desc)
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  findByUserId(userId, options = {}) {
    try {
      // Validate userId
      this._validateRequiredParams({ userId }, ['userId']);
      
      // Process options with defaults
      const { 
        limit = 20, 
        offset = 0, 
        activeOnly = false, 
        sortBy = 'priority', 
        sortDir = 'asc' 
      } = options;
      
      return await this._withRetry(async () => {
        this._log('debug', 'Finding focus areas by user ID', { userId, options });
        
        // Start building the query
        let query = this.db
          .from(this.tableName)
          .select('*')
          .eq('user_id', userId);
        
        // Add active filter if provided
        if (activeOnly) {
          query = query.eq('active', true);
        }
        
        // Convert camelCase to snake_case for database fields
        const dbSortBy = this._camelToSnakeField(sortBy);
        
        // Add sorting and pagination
        query = query
          .order(dbSortBy, { ascending: sortDir === 'asc' })
          .range(offset, offset + limit - 1);
        
        const { data, error } = await query;
  
        if (error) {
          throw new DatabaseError(`Failed to fetch focus areas by user ID: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findByUserId',
            metadata: { userId, options }
          });
        }
        
        // Convert data to domain objects
        return (data || []).map(record => FocusArea.fromDatabase(record));
      }, 'findByUserId', { userId, options });
    } catch (error) {
      // Map errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // For any other error
      if (!(error instanceof FocusAreaPersistenceError)) {
        this._log('error', 'Error in findByUserId', { 
          userId, 
          options,
          error: error.message,
          stack: error.stack 
        });
        
        throw new FocusAreaPersistenceError(`Failed to find focus areas by user ID: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Create a new focus area
   * @param {Object} focusAreaData - Focus area data
   * @returns {Promise<FocusArea>} Created focus area
   * @throws {FocusAreaValidationError} If focus area data is invalid
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  createFocusArea(focusAreaData) {
    try {
      // Validate required parameters
      this._validateRequiredParams(focusAreaData, ['userId', 'name']);
      
      // Create a focus area domain object (this will validate the data)
      const focusArea = new FocusArea({
        userId: focusAreaData.userId,
        name: focusAreaData.name,
        description: focusAreaData.description || '',
        priority: focusAreaData.priority || 1,
        metadata: focusAreaData.metadata || {}
      });
      
      // Save to database
      return await this.save(focusArea);
    } catch (error) {
      // Pass through specific domain errors
      if (error instanceof FocusAreaValidationError ||
          error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      // For validation errors
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      this._log('error', 'Error creating focus area', { 
        focusAreaData, 
        error: error.message,
        stack: error.stack 
      });
      
      throw new FocusAreaPersistenceError(`Failed to create focus area: ${error.message}`);
    }
  }

  /**
   * Save a focus area to the database
   * @param {FocusArea} focusArea - Focus area to save
   * @returns {Promise<FocusArea>} Saved focus area
   * @throws {FocusAreaValidationError} If focus area fails validation
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  save(focusArea) {
    try {
      // Validate that we have a FocusArea instance
      if (!(focusArea instanceof FocusArea)) {
        throw new ValidationError('Can only save FocusArea instances', {
          entityType: this.domainName
        });
      }
      
      // Collect domain events for publishing after successful save
      const domainEvents = focusArea.getDomainEvents ? focusArea.getDomainEvents() : [];
      
      // Clear the events from the entity to prevent double-publishing
      if (domainEvents.length > 0 && focusArea.clearDomainEvents) {
        focusArea.clearDomainEvents();
      }
      
      return await this._withRetry(async () => {
        // Check if this is a new focus area or an update
        const existingFocusArea = await this.findById(focusArea.id).catch(() => null);
        const isUpdate = existingFocusArea !== null;
        
        // Convert to database schema (camelCase to snake_case)
        const focusAreaData = this._camelToSnake(focusArea.toObject());
        
        let result;
        
        if (isUpdate) {
          // Update existing focus area
          this._log('debug', 'Updating existing focus area', { id: focusArea.id });
          
          const { data, error } = await this.db
            .from(this.tableName)
            .update(focusAreaData)
            .eq('id', focusArea.id)
            .select()
            .single();
          
          if (error) {
            throw new DatabaseError(`Failed to update focus area: ${error.message}`, {
              cause: error,
              entityType: this.domainName,
              operation: 'update',
              metadata: { focusAreaId: focusArea.id }
            });
          }
          
          result = data;
        } else {
          // Insert new focus area
          this._log('debug', 'Creating new focus area', { id: focusArea.id });
          
          const { data, error } = await this.db
            .from(this.tableName)
            .insert(focusAreaData)
            .select()
            .single();
          
          if (error) {
            throw new DatabaseError(`Failed to create focus area: ${error.message}`, {
              cause: error,
              entityType: this.domainName,
              operation: 'create',
              metadata: { focusAreaId: focusArea.id }
            });
          }
          
          result = data;
        }
        
        this._log('debug', 'Saved focus area', { 
          id: focusArea.id, 
          name: focusArea.name 
        });
        
        // Create domain object from database result
        const savedFocusArea = FocusArea.fromDatabase(result);
        
        // Publish any collected domain events AFTER successful persistence
        if (domainEvents.length > 0) {
          try {
            this._log('debug', 'Publishing collected domain events', {
              id: savedFocusArea.id,
              eventCount: domainEvents.length
            });
            
            // Publish the events one by one in sequence (maintaining order)
            for (const event of domainEvents) {
              await this.eventBus.publish(event);
            }
          } catch (eventError) {
            // Log event publishing error but don't fail the save operation
            this._log('error', 'Error publishing domain events', { 
              id: savedFocusArea.id, 
              error: eventError.message 
            });
          }
        }
        
        return savedFocusArea;
      }, 'save', { focusAreaId: focusArea.id });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof FocusAreaValidationError ||
          error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      // For any other error
      this._log('error', 'Error in save', { 
        focusAreaId: focusArea.id, 
        error: error.message,
        stack: error.stack 
      });
      
      throw new FocusAreaPersistenceError(`Failed to save focus area: ${error.message}`);
    }
  }

  /**
   * Save multiple focus areas in a batch operation
   * @param {string} userId - User ID
   * @param {Array<FocusArea|Object|string>} focusAreas - Array of focus areas
   * @param {Object} _trx - Transaction object (optional)
   * @returns {Promise<Array<FocusArea>>} - Array of saved focus areas
   * @throws {FocusAreaValidationError} If validation fails
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  saveBatch(userId, focusAreas, _trx = null) {
    try {
      // Validate inputs
      this._validateRequiredParams({ userId }, ['userId']);
      
      if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
        throw new ValidationError('Focus areas must be a non-empty array', {
          entityType: this.domainName
        });
      }
      
      this._log('info', 'Saving batch of focus areas', { 
        userId, 
        count: focusAreas.length 
      });
      
      // Process different input types into FocusArea domain objects
      const focusAreaEntities = focusAreas.map(area => {
        if (typeof area === 'string') {
          return new FocusArea({
            userId,
            name: area,
            description: '',
            active: true,
            priority: 1,
            metadata: {}
          });
        } else if (area instanceof FocusArea) {
          return area;
        } else if (typeof area === 'object') {
          return new FocusArea({
            userId,
            name: area.name,
            description: area.description || '',
            active: area.active !== undefined ? area.active : true,
            priority: area.priority || 1,
            metadata: area.metadata || {}
          });
        } else {
          throw new ValidationError('Invalid focus area format', {
            entityType: this.domainName
          });
        }
      });
      
      // Use transaction to ensure all-or-nothing behavior
      return await this.withTransaction(async _trx => {
        // Save each focus area individually, tracking domain events
        const savedAreas = [];
        const allDomainEvents = [];
        
        for (const entity of focusAreaEntities) {
          // Collect domain events
          const entityEvents = entity.getDomainEvents ? entity.getDomainEvents() : [];
          if (entityEvents.length > 0 && entity.clearDomainEvents) {
            entity.clearDomainEvents();
          }
          allDomainEvents.push(...entityEvents);
          
          // Convert to database format
          const dbData = this._camelToSnake(entity.toObject());
          
          // Save to database
          const { data, error } = await this.db
            .from(this.tableName)
            .upsert(dbData)
            .select()
            .single();
          
          if (error) {
            throw new DatabaseError(`Failed to save focus area in batch: ${error.message}`, {
              cause: error,
              entityType: this.domainName,
              operation: 'saveBatch',
              metadata: { 
                focusAreaId: entity.id,
                userId 
              }
            });
          }
          
          savedAreas.push(FocusArea.fromDatabase(data));
        }
        
        // Publish collected domain events after all saves succeed
        for (const event of allDomainEvents) {
          await this.eventBus.publish(event);
        }
        
        this._log('info', 'Successfully saved batch of focus areas', {
          userId,
          count: savedAreas.length,
          eventsPublished: allDomainEvents.length
        });
        
        return savedAreas;
      });
    } catch (error) {
      // Map errors appropriately
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof FocusAreaValidationError ||
          error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in saveBatch', {
        userId,
        count: focusAreas?.length,
        error: error.message,
        stack: error.stack
      });
      
      throw new FocusAreaPersistenceError(`Failed to save focus areas batch: ${error.message}`);
    }
  }

  /**
   * Update a focus area
   * @param {string} id - Focus area ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<FocusArea>} Updated focus area
   * @throws {FocusAreaNotFoundError} If focus area not found
   * @throws {FocusAreaValidationError} If update data fails validation
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  update(id, updateData) {
    try {
      // Validate ID
      this._validateId(id);
      
      // Get existing focus area
      const focusArea = await this.findById(id, true);
      
      // Update the domain object with new data
      focusArea.update(updateData);
      
      // Save the updated focus area
      return await this.save(focusArea);
    } catch (error) {
      // Pass through domain-specific errors
      if (error instanceof FocusAreaNotFoundError ||
          error instanceof FocusAreaValidationError ||
          error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error updating focus area', { 
        id, 
        updateData,
        error: error.message,
        stack: error.stack 
      });
      
      throw new FocusAreaPersistenceError(`Failed to update focus area: ${error.message}`);
    }
  }

  /**
   * Delete a focus area
   * @param {string} id - Focus area ID
   * @returns {Promise<boolean>} True if focus area was deleted
   * @throws {FocusAreaNotFoundError} If focus area not found
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  deleteById(id) {
    try {
      // Validate ID
      this._validateId(id);
      
      // Check if focus area exists
      const focusArea = await this.findById(id, true);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Deleting focus area', { id });
        
        const { error } = await this.db
          .from(this.tableName)
          .delete()
          .eq('id', id);
        
        if (error) {
          throw new DatabaseError(`Failed to delete focus area: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'delete',
            metadata: { id }
          });
        }
        
        // Create and publish deletion event
        try {
          const deletionEvent = {
            type: EventTypes.FOCUS_AREA_DELETED,
            payload: {
              focusAreaId: id,
              userId: focusArea.userId,
              name: focusArea.name
            },
            timestamp: new Date().toISOString()
          };
          
          await this.eventBus.publish(deletionEvent);
        } catch (eventError) {
          // Log event publishing error but don't fail the delete operation
          this._log('error', 'Error publishing deletion event', { 
            id, 
            error: eventError.message 
          });
        }
        
        return true;
      }, 'deleteById', { id });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof EntityNotFoundError) {
        throw new FocusAreaNotFoundError(id);
      }
      
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // Pass through domain-specific errors
      if (error instanceof FocusAreaNotFoundError ||
          error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error deleting focus area', { 
        id, 
        error: error.message,
        stack: error.stack 
      });
      
      throw new FocusAreaPersistenceError(`Failed to delete focus area: ${error.message}`);
    }
  }

  /**
   * Delete all focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of deleted focus areas
   * @throws {FocusAreaPersistenceError} If database operation fails
   */
  deleteAllForUser(userId) {
    try {
      // Validate userId
      this._validateRequiredParams({ userId }, ['userId']);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Deleting all focus areas for user', { userId });
        
        // First, get the list of focus areas to create deletion events
        const focusAreas = await this.findByUserId(userId);
        
        // Delete all focus areas
        const { error, count } = await this.db
          .from(this.tableName)
          .delete()
          .eq('user_id', userId)
          .select('count');
        
        if (error) {
          throw new DatabaseError(`Failed to delete focus areas for user: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'deleteAllForUser',
            metadata: { userId }
          });
        }
        
        // Publish deletion events
        try {
          for (const focusArea of focusAreas) {
            const deletionEvent = {
              type: EventTypes.FOCUS_AREA_DELETED,
              payload: {
                focusAreaId: focusArea.id,
                userId: focusArea.userId,
                name: focusArea.name
              },
              timestamp: new Date().toISOString()
            };
            
            await this.eventBus.publish(deletionEvent);
          }
        } catch (eventError) {
          // Log event publishing error but don't fail the operation
          this._log('error', 'Error publishing focus area deletion events', { 
            userId, 
            error: eventError.message 
          });
        }
        
        return count || focusAreas.length;
      }, 'deleteAllForUser', { userId });
    } catch (error) {
      // Map errors appropriately
      if (error instanceof ValidationError) {
        throw new FocusAreaValidationError(error.message);
      }
      
      if (error instanceof DatabaseError) {
        throw new FocusAreaPersistenceError(error.message);
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error deleting all focus areas for user', { 
        userId, 
        error: error.message,
        stack: error.stack 
      });
      
      throw new FocusAreaPersistenceError(`Failed to delete all focus areas for user: ${error.message}`);
    }
  }

  /**
   * Helper method to convert camelCase field name to snake_case
   * @param {string} field - Field name in camelCase
   * @returns {string} Field name in snake_case
   * @private
   */
  _camelToSnakeField(field) {
    return field.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}

// Export a singleton instance and the class
const focusAreaRepository = new FocusAreaRepository();

module.exports = {
  FocusAreaRepository,
  focusAreaRepository
}; 