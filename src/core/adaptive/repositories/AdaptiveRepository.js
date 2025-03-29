'use strict';

/**
 * Adaptive Repository
 * 
 * Handles data access operations for adaptive learning models.
 * 
 * @module AdaptiveRepository
 * @requires Recommendation
 * @requires RecommendationSchema
 */

const Recommendation = require('../models/Recommendation');
const recommendationMapper = require('../mappers/RecommendationMapper');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { 
  // RecommendationSchema - Not currently used but may be needed for validation
  RecommendationDatabaseSchema 
} = require('../schemas/RecommendationSchema');
const { 
  BaseRepository,
  // EntityNotFoundError - Not directly used but available via errorMapper
  ValidationError,
  DatabaseError 
} = require('../../../core/infra/repositories/BaseRepository');
const { 
  // AdaptiveError - Not directly used but available via errorMapper
  AdaptiveNotFoundError, 
  AdaptiveValidationError,
  AdaptiveRepositoryError 
} = require('../errors/adaptiveErrors');
const {
  applyRepositoryErrorHandling,
  createErrorMapper,
  createErrorCollector
} = require('../../../core/infra/errors/centralizedErrorUtils');
const domainEvents = require('../../../core/common/events/domainEvents');

// Create an error mapper for repositories
const adaptiveRepositoryErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: AdaptiveNotFoundError,
    ValidationError: AdaptiveValidationError,
    DatabaseError: AdaptiveRepositoryError,
  },
  AdaptiveRepositoryError
);

/**
 * Repository for handling adaptive learning recommendations
 * @extends BaseRepository
 */
class AdaptiveRepository extends BaseRepository {
  /**
   * Create a new AdaptiveRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'user_recommendations',
      domainName: 'adaptive',
      logger: options.logger,
      maxRetries: 3
    });
    
    // Apply standardized error handling to methods using the centralized utilities
    this.findById = applyRepositoryErrorHandling(this, 'findById', 'adaptive', adaptiveRepositoryErrorMapper);
    this.findLatestForUser = applyRepositoryErrorHandling(this, 'findLatestForUser', 'adaptive', adaptiveRepositoryErrorMapper);
    this.findByUserId = applyRepositoryErrorHandling(this, 'findByUserId', 'adaptive', adaptiveRepositoryErrorMapper);
    this.save = applyRepositoryErrorHandling(this, 'save', 'adaptive', adaptiveRepositoryErrorMapper);
    this.delete = applyRepositoryErrorHandling(this, 'delete', 'adaptive', adaptiveRepositoryErrorMapper);
    this.deleteAllForUser = applyRepositoryErrorHandling(this, 'deleteAllForUser', 'adaptive', adaptiveRepositoryErrorMapper);
  }

  /**
   * Find a recommendation by ID
   * @param {string} id - Recommendation ID to search for
   * @returns {Promise<Recommendation|null>} Recommendation object or null if not found
   * @throws {AdaptiveNotFoundError} If recommendation can't be found
   * @throws {AdaptiveValidationError} If recommendation data is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async findById(id) {
    try {
      this._validateId(id);
      
      this._log('debug', 'Finding recommendation by ID', { id });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new DatabaseError(`Failed to fetch recommendation: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findById',
          metadata: { id }
        });
      }
      
      if (!data) {
        this._log('debug', 'Recommendation not found', { id });
        return null;
      }

      // Validate data with Zod schema
      const validationResult = RecommendationDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        this._log('error', 'Invalid recommendation data from database', { 
          errors: validationResult.error.flatten()
        });
        
        throw new ValidationError(`Invalid recommendation data: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }

      // Use mapper to convert database record to domain entity
      return recommendationMapper.toDomain(data);
    } catch (error) {
      this._log('error', 'Error finding recommendation by ID', { 
        error: error.message, 
        stack: error.stack,
        id 
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }

  /**
   * Find latest recommendation for a user
   * @param {string} userId - User ID to find recommendations for
   * @returns {Promise<Recommendation|null>} Recommendation object or null if not found
   * @throws {AdaptiveValidationError} If userId is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async findLatestForUser(userId) {
    try {
      this._validateRequiredParams({ userId }, ['userId']);
      
      this._log('debug', 'Finding latest recommendation for user', { userId });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new DatabaseError(`Failed to fetch recommendation for user: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findLatestForUser',
          metadata: { userId }
        });
      }
      
      if (!data) {
        this._log('debug', 'No recommendation found for user', { userId });
        return null;
      }

      // Validate data with Zod schema
      const validationResult = RecommendationDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        this._log('error', 'Invalid recommendation data from database', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new ValidationError(`Invalid recommendation data: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }

      // Use mapper to convert database record to domain entity
      return recommendationMapper.toDomain(data);
    } catch (error) {
      this._log('error', 'Error finding latest recommendation for user', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }

  /**
   * Find recommendations by user ID
   * @param {string} userId - User ID to find recommendations for
   * @param {number} limit - Maximum number of recommendations to return (default: 10)
   * @returns {Promise<Array<Recommendation>>} Array of Recommendation objects
   * @throws {AdaptiveValidationError} If userId is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async findByUserId(userId, limit = 10) {
    try {
      this._validateRequiredParams({ userId }, ['userId']);
      
      this._log('debug', 'Finding recommendations for user', { userId, limit });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new DatabaseError(`Failed to fetch recommendations for user: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findByUserId',
          metadata: { userId, limit }
        });
      }

      // Map and validate each recommendation
      const errorCollector = createErrorCollector();
      const validItems = [];
      
      for (const item of (data || [])) {
        // Validate data with Zod schema
        const validationResult = RecommendationDatabaseSchema.safeParse(item);
        if (!validationResult.success) {
          errorCollector.collect(
            new ValidationError(`Invalid recommendation data: ${validationResult.error.message}`, {
              entityType: this.domainName,
              validationErrors: validationResult.error.flatten()
            }),
            `recommendation_id_${item.id}`
          );
          this._log('warn', 'Skipping invalid recommendation data', {
            errors: validationResult.error.flatten(),
            id: item.id
          });
          continue;
        }
        validItems.push(item);
      }
      
      // Log collected errors if any
      if (errorCollector.hasErrors()) {
        this._log('warn', 'Some recommendations were invalid and skipped', {
          userId,
          errorCount: errorCollector.getErrors().length
        });
      }
      
      // Use mapper to convert database records to domain entities
      return recommendationMapper.toDomainCollection(validItems);
    } catch (error) {
      this._log('error', 'Error finding recommendations by user ID', { 
        error: error.message, 
        stack: error.stack,
        userId, 
        limit 
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }

  /**
   * Save a recommendation
   * @param {Recommendation} recommendation - Recommendation to save
   * @returns {Promise<Recommendation>} Saved recommendation
   * @throws {AdaptiveValidationError} If recommendation data is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async save(recommendation) {
    try {
      // Validate recommendation object
      if (!recommendation) {
        throw new ValidationError('Recommendation object is required', {
          entityType: this.domainName
        });
      }
      
      if (!(recommendation instanceof Recommendation)) {
        throw new ValidationError('Object must be an Recommendation instance', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Saving recommendation', { 
        id: recommendation.id, 
        userId: recommendation.userId
      });
      
      // Use mapper to convert domain entity to database format
      const recommendationData = recommendationMapper.toPersistence(recommendation);
      
      // Validate recommendation data with Zod schema
      const validationResult = RecommendationDatabaseSchema.safeParse(recommendationData);
      
      if (!validationResult.success) {
        this._log('error', 'Recommendation validation failed', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new ValidationError(`Invalid recommendation data: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }
      
      // Use validated data
      const validData = validationResult.data;

      // Set ID if not present (for new recommendations)
      if (!validData.id) { 
        validData.id = uuidv4(); 
      }

      // Get domain events before persistence
      const events = recommendation.getDomainEvents();

      // Upsert recommendation data
      const { data, error } = await this.db
        .from(this.tableName)
        .upsert(validData)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to save recommendation: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'save',
          metadata: { id: validData.id }
        });
      }

      this._log('info', 'Recommendation saved successfully', { id: data.id });
      
      // Publish domain events after successful persistence
      if (events && events.length > 0) {
        this._log('debug', 'Publishing domain events', { 
          count: events.length, 
          eventTypes: events.map(e => e.type) 
        });
        
        events.forEach(event => {
          domainEvents.publish(event.type, event.data);
        });
        
        // Clear events to prevent duplicate publishing
        recommendation.clearDomainEvents();
      }
      
      // Use mapper to convert database record to domain entity
      return recommendationMapper.toDomain(data);
    } catch (error) {
      this._log('error', 'Error saving recommendation', { 
        error: error.message, 
        stack: error.stack,
        id: recommendation?.id
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }

  /**
   * Delete a recommendation by ID
   * @param {string} id - Recommendation ID to delete
   * @returns {Promise<boolean>} True if successful
   * @throws {AdaptiveValidationError} If ID is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async delete(id) {
    try {
      this._validateId(id);
      
      this._log('debug', 'Deleting recommendation', { id });
      
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Failed to delete recommendation: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'delete',
          metadata: { id }
        });
      }

      this._log('info', 'Recommendation deleted successfully', { id });
      
      return true;
    } catch (error) {
      this._log('error', 'Error deleting recommendation', { 
        error: error.message, 
        stack: error.stack,
        id
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }

  /**
   * Delete all recommendations for a user
   * @param {string} userId - User ID whose recommendations should be deleted
   * @returns {Promise<boolean>} True if successful
   * @throws {AdaptiveValidationError} If userId is invalid
   * @throws {AdaptiveRepositoryError} If database operation fails
   */
  async deleteAllForUser(userId) {
    try {
      this._validateRequiredParams({ userId }, ['userId']);
      
      this._log('debug', 'Deleting all recommendations for user', { userId });
      
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new DatabaseError(`Failed to delete user recommendations: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'deleteAllForUser',
          metadata: { userId }
        });
      }

      this._log('info', 'All user recommendations deleted successfully', { userId });
      
      return true;
    } catch (error) {
      this._log('error', 'Error deleting all recommendations for user', { 
        error: error.message, 
        stack: error.stack,
        userId
      });
      
      // Let the standardized error handling map the error
      throw error;
    }
  }
}

// Export class and a default instance
const adaptiveRepository = new AdaptiveRepository();

module.exports = {
  AdaptiveRepository,
  adaptiveRepository,
  AdaptiveNotFoundError,
  AdaptiveValidationError,
  AdaptiveRepositoryError
}; 