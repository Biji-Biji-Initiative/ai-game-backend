'use strict';

/**
 * Enhanced Evaluation Repository
 * 
 * Responsible for storing and retrieving evaluation data from the database.
 * 
 * @module evaluationRepository
 * @requires BaseRepository
 * @requires Evaluation
 * @requires EvaluationSchema
 */

const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { Evaluation } = require('../models/Evaluation');
const { 
  EvaluationSchema, 
  EvaluationUpdateSchema 
} = require('../schemas/EvaluationSchema');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EventTypes } = require('../../../common/events/domainEvents');
const { 
  BaseRepository, 
  EntityNotFoundError, 
  ValidationError, 
  DatabaseError 
} = require('../../../core/infra/repositories/BaseRepository');

// Import domain-specific error classes
const {
  EvaluationError,
  EvaluationNotFoundError,
  EvaluationValidationError,
  EvaluationRepositoryError
} = require('../errors/EvaluationErrors');

const {
  createErrorMapper,
  createErrorCollector
} = require('../../../core/infra/errors/errorStandardization');

// Create an error mapper for the evaluation domain
const evaluationErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: EvaluationNotFoundError,
    ValidationError: EvaluationValidationError,
    DatabaseError: EvaluationRepositoryError
  },
  EvaluationError
);

/**
 * Repository for evaluation data access
 * @extends BaseRepository
 */
class EvaluationRepository extends BaseRepository {
  /**
   * Create a new EvaluationRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.eventBus - Event bus for domain events
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'evaluations',
      domainName: 'evaluation',
      logger: options.logger,
      maxRetries: 3
    });
    
    this.eventBus = options.eventBus || eventBus;
    this.validateUuids = true;
    
    // Apply standardized error handling to all repository methods
    this.createEvaluation = this._wrapWithErrorHandling('createEvaluation');
    this.getEvaluationById = this._wrapWithErrorHandling('getEvaluationById');
    this.updateEvaluation = this._wrapWithErrorHandling('updateEvaluation');
    this.deleteEvaluation = this._wrapWithErrorHandling('deleteEvaluation');
    this.findEvaluationsForUser = this._wrapWithErrorHandling('findEvaluationsForUser');
    this.saveEvaluation = this._wrapWithErrorHandling('saveEvaluation');
    this.findEvaluationsForChallenge = this._wrapWithErrorHandling('findEvaluationsForChallenge');
    this.findById = this._wrapWithErrorHandling('findById');
    this.save = this._wrapWithErrorHandling('save');
    this.findByUserAndChallenge = this._wrapWithErrorHandling('findByUserAndChallenge');
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
        this.logger.error(`Error in ${this.domainName} repository ${methodName}`, {
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
        const mappedError = evaluationErrorMapper(error, {
          methodName,
          domainName: this.domainName,
          args,
        });
        throw mappedError;
      }
    };
  }

  /**
   * Create a new evaluation
   * @param {Object} evaluationData - Evaluation data
   * @returns {Promise<Object>} Created evaluation object
   * @throws {EvaluationValidationError} If evaluation data is invalid
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async createEvaluation(evaluationData) {
    try {
      // Validate input
      if (!evaluationData) {
        throw new ValidationError('Evaluation data is required', {
          entityType: this.domainName,
          operation: 'create'
        });
      }
      
      // Validate using schema
      const validationResult = EvaluationSchema.safeParse(evaluationData);
      
      if (!validationResult.success) {
        this._log('error', 'Evaluation validation failed', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new ValidationError(`Evaluation validation failed: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }
      
      const data = { ...evaluationData };
      
      // Generate ID if not provided
      if (!data.id) {
        data.id = uuidv4();
      }
      
      // Set timestamps if not provided
      if (!data.createdAt) {
        data.createdAt = new Date().toISOString();
      }
      
      if (!data.updatedAt) {
        data.updatedAt = new Date().toISOString();
      }
      
      // Convert to database format (camelCase to snake_case)
      const dbData = this._camelToSnake(data);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Creating evaluation', { 
          id: data.id,
          userId: data.userId,
          challengeId: data.challengeId
        });
        
        const { data: result, error } = await this.db
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();
        
        if (error) {
          throw new DatabaseError(`Failed to create evaluation: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'create',
            metadata: { 
              id: data.id,
              userId: data.userId,
              challengeId: data.challengeId
            }
          });
        }
        
        // Convert snake_case fields to camelCase
        const camelCaseResult = this._snakeToCamel(result);
        
        // Create domain model from database result
        const createdEvaluation = Evaluation.fromDatabase(camelCaseResult);
        
        // Publish evaluation created event
        try {
          await this.eventBus.publish({
            type: EventTypes.EVALUATION_CREATED,
            payload: {
              evaluationId: createdEvaluation.id,
              userId: createdEvaluation.userId,
              challengeId: createdEvaluation.challengeId,
              score: createdEvaluation.score,
              timestamp: createdEvaluation.createdAt
            }
          });
          
          this._log('debug', 'Published evaluation created event', { 
            id: createdEvaluation.id 
          });
        } catch (eventError) {
          this._log('error', 'Error publishing evaluation created event', { 
            id: createdEvaluation.id, 
            error: eventError.message 
          });
        }
        
        return createdEvaluation;
      }, 'createEvaluation', { id: data.id });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this._log('error', 'Error in createEvaluation', { 
        error: error.message,
        stack: error.stack,
        evaluationData
      });
      
      throw new EvaluationRepositoryError(`Failed to create evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationData }
      });
    }
  }

  /**
   * Get evaluation by ID
   * @param {string} evaluationId - Evaluation ID
   * @param {boolean} throwIfNotFound - Whether to throw an error if not found
   * @returns {Promise<Object>} Evaluation object
   * @throws {EvaluationNotFoundError} If evaluation not found and throwIfNotFound is true
   * @throws {EvaluationValidationError} If evaluation ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async getEvaluationById(evaluationId, throwIfNotFound = false) {
    try {
      // Validate ID
      this._validateId(evaluationId);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Getting evaluation by ID', { evaluationId });
        
        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('id', evaluationId)
          .maybeSingle();
        
        if (error) {
          throw new DatabaseError(`Failed to retrieve evaluation: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'getById',
            metadata: { evaluationId }
          });
        }
        
        if (!data) {
          this._log('debug', 'Evaluation not found', { evaluationId });
          
          if (throwIfNotFound) {
            throw new EntityNotFoundError(`Evaluation with ID ${evaluationId} not found`, {
              entityId: evaluationId,
              entityType: this.domainName
            });
          }
          
          return null;
        }
        
        // Convert snake_case fields to camelCase
        const camelCaseData = this._snakeToCamel(data);
        
        // Create domain model from database data
        return Evaluation.fromDatabase(camelCaseData);
      }, 'getEvaluationById', { evaluationId });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof EntityNotFoundError) {
        throw new EvaluationNotFoundError(`Evaluation with ID ${evaluationId} not found`, {
          cause: error,
          metadata: { evaluationId }
        });
      }
      
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError || 
          error instanceof EvaluationNotFoundError) {
        throw error;
      }
      
      this._log('error', 'Error getting evaluation by ID', { 
        error: error.message, 
        stack: error.stack,
        evaluationId 
      });
      
      throw new EvaluationRepositoryError(`Failed to get evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId }
      });
    }
  }

  /**
   * Update an evaluation
   * @param {string} evaluationId - Evaluation ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated evaluation object
   * @throws {EvaluationNotFoundError} If evaluation not found
   * @throws {EvaluationValidationError} If update data is invalid
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async updateEvaluation(evaluationId, updateData) {
    try {
      // Validate inputs
      this._validateId(evaluationId);
      
      if (!updateData || typeof updateData !== 'object') {
        throw new ValidationError('Update data is required', {
          entityType: this.domainName
        });
      }
      
      // Validate update data using schema
      const validationResult = EvaluationUpdateSchema.safeParse(updateData);
      
      if (!validationResult.success) {
        this._log('error', 'Evaluation update validation failed', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new ValidationError(`Evaluation update validation failed: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }
      
      return await this._withRetry(async () => {
        // First check if evaluation exists
        const existingEvaluation = await this.getEvaluationById(evaluationId, true);
        
        // Prepare update data
        const data = { ...updateData };
        
        // Always update the updatedAt timestamp
        data.updatedAt = new Date().toISOString();
        
        // Convert to database schema (camelCase to snake_case)
        const dbUpdateData = this._camelToSnake(data);
        
        // Remove undefined fields
        Object.keys(dbUpdateData).forEach(key => {
          if (dbUpdateData[key] === undefined) {
            delete dbUpdateData[key];
          }
        });
        
        // Log original evaluation data for tracking changes
        this._log('debug', 'Updating evaluation with original data', {
          evaluationId,
          originalData: {
            userId: existingEvaluation.userId,
            challengeId: existingEvaluation.challengeId,
            score: existingEvaluation.score
          }
        });
        
        // Update in database
        const { data: result, error } = await this.db
          .from(this.tableName)
          .update(dbUpdateData)
          .eq('id', evaluationId)
          .select()
          .single();
        
        if (error) {
          throw new DatabaseError(`Failed to update evaluation: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'update',
            metadata: { evaluationId }
          });
        }
        
        this._log('info', 'Evaluation updated successfully', { evaluationId });
        
        // Convert snake_case fields to camelCase
        const camelCaseResult = this._snakeToCamel(result);
        
        // Create domain model from database result
        const updatedEvaluation = Evaluation.fromDatabase(camelCaseResult);
        
        // Publish evaluation updated event
        const errorCollector = createErrorCollector();
        
        try {
          await this.eventBus.publish({
            type: EventTypes.EVALUATION_UPDATED,
            payload: {
              evaluationId: updatedEvaluation.id,
              userId: updatedEvaluation.userId,
              challengeId: updatedEvaluation.challengeId,
              score: updatedEvaluation.score,
              timestamp: updatedEvaluation.updatedAt
            }
          });
          
          this._log('debug', 'Published evaluation updated event', { 
            id: updatedEvaluation.id 
          });
        } catch (eventError) {
          errorCollector.collect(eventError, 'evaluation_updated_event');
          this._log('error', 'Error publishing evaluation updated event', { 
            id: updatedEvaluation.id, 
            error: eventError.message 
          });
        }
        
        // Process any collected errors if needed
        if (errorCollector.hasErrors()) {
          this._log('warn', 'Non-critical errors occurred during update', {
            evaluationId,
            errorCount: errorCollector.getErrors().length
          });
        }
        
        return updatedEvaluation;
      }, 'updateEvaluation', { evaluationId });
    } catch (error) {
      // Map generic repository errors to domain-specific errors using errorMapper
      return evaluationErrorMapper(error);
    }
  }

  /**
   * Delete an evaluation
   * @param {string} evaluationId - Evaluation ID to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {EvaluationValidationError} If evaluation ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async deleteEvaluation(evaluationId) {
    try {
      // Validate ID
      this._validateId(evaluationId);
      
      return await this._withRetry(async () => {
        // First check if evaluation exists
        const existingEvaluation = await this.getEvaluationById(evaluationId, true);
        
        this._log('debug', 'Deleting evaluation', { evaluationId });
        
        const { error } = await this.db
          .from(this.tableName)
          .delete()
          .eq('id', evaluationId);
        
        if (error) {
          throw new DatabaseError(`Failed to delete evaluation: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'delete',
            metadata: { evaluationId }
          });
        }
        
        this._log('info', 'Evaluation deleted successfully', { evaluationId });
        
        // Publish evaluation deleted event
        try {
          await this.eventBus.publish({
            type: EventTypes.EVALUATION_DELETED,
            payload: {
              evaluationId: existingEvaluation.id,
              userId: existingEvaluation.userId,
              challengeId: existingEvaluation.challengeId,
              timestamp: new Date().toISOString()
            }
          });
          
          this._log('debug', 'Published evaluation deleted event', { 
            id: existingEvaluation.id 
          });
        } catch (eventError) {
          this._log('error', 'Error publishing evaluation deleted event', { 
            id: existingEvaluation.id, 
            error: eventError.message 
          });
        }
        
        return true;
      }, 'deleteEvaluation', { evaluationId });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof EntityNotFoundError) {
        throw new EvaluationNotFoundError(`Evaluation with ID ${evaluationId} not found`, {
          cause: error,
          metadata: { evaluationId }
        });
      }
      
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError || 
          error instanceof EvaluationNotFoundError) {
        throw error;
      }
      
      this._log('error', 'Error deleting evaluation', { 
        error: error.message, 
        stack: error.stack,
        evaluationId
      });
      
      throw new EvaluationRepositoryError(`Failed to delete evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId }
      });
    }
  }

  /**
   * Find evaluations for a user
   * @param {string} userId - User ID to find evaluations for
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Maximum number of results
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.sortBy] - Field to sort by
   * @param {string} [options.sortDirection] - Sort direction (asc/desc)
   * @returns {Promise<Array<Object>>} Array of evaluation objects
   * @throws {EvaluationValidationError} If user ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async findEvaluationsForUser(userId, options = {}) {
    try {
      // Validate userId
      this._validateRequiredParams({ userId }, ['userId']);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Finding evaluations for user', { userId, options });
        
        let query = this.db
          .from(this.tableName)
          .select('*')
          .eq('user_id', userId);
        
        // Apply limit if provided
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        // Apply offset if provided
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }
        
        // Apply sort
        const sortBy = options.sortBy || 'created_at';
        const sortDir = options.sortDir || 'desc';
        query = query.order(sortBy, { ascending: sortDir === 'asc' });
        
        const { data, error } = await query;
        
        if (error) {
          throw new DatabaseError(`Failed to fetch evaluations for user: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findForUser',
            metadata: { userId, options }
          });
        }
        
        // Convert each result to a domain model
        return (data || []).map(item => {
          const camelCaseItem = this._snakeToCamel(item);
          return Evaluation.fromDatabase(camelCaseItem);
        });
      }, 'findEvaluationsForUser', { userId, options });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this._log('error', 'Error finding evaluations for user', { 
        error: error.message, 
        stack: error.stack,
        userId, 
        options
      });
      
      throw new EvaluationRepositoryError(`Failed to find evaluations for user: ${error.message}`, {
        cause: error,
        metadata: { userId, options }
      });
    }
  }

  /**
   * Save an evaluation (create or update)
   * @param {Evaluation} evaluation - Evaluation to save
   * @returns {Promise<Evaluation>} Saved evaluation
   * @throws {EvaluationValidationError} If evaluation is invalid
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async saveEvaluation(evaluation) {
    try {
      // Validate evaluation object
      if (!evaluation) {
        throw new ValidationError('Evaluation object is required', {
          entityType: this.domainName
        });
      }
      
      if (!(evaluation instanceof Evaluation)) {
        throw new ValidationError('Object must be an Evaluation instance', {
          entityType: this.domainName
        });
      }
      
      if (!evaluation.isValid()) {
        throw new ValidationError('Invalid evaluation instance', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Saving evaluation', { 
        id: evaluation.id, 
        userId: evaluation.userId,
        challengeId: evaluation.challengeId
      });
      
      const evaluationData = evaluation.toObject();
      const validationResult = EvaluationSchema.safeParse(evaluationData);
      
      if (!validationResult.success) {
        this._log('error', 'Evaluation validation failed during save', { 
          errors: validationResult.error.flatten() 
        });
        
        throw new ValidationError(`Evaluation validation failed: ${validationResult.error.message}`, {
          entityType: this.domainName,
          validationErrors: validationResult.error.flatten()
        });
      }
      
      // Collect domain events before saving
      const domainEvents = evaluation.getDomainEvents ? evaluation.getDomainEvents() : [];
      
      // Clear events from the entity
      if (domainEvents.length > 0 && evaluation.clearDomainEvents) {
        evaluation.clearDomainEvents();
      }
      
      // Check if evaluation exists
      const existing = await this.getEvaluationById(evaluation.id).catch(() => null);
      
      let savedEvaluation;
      if (existing) {
        savedEvaluation = await this.updateEvaluation(evaluation.id, evaluation.toObject());
      } else {
        savedEvaluation = await this.createEvaluation(evaluation.toObject());
      }
      
      // Publish collected domain events AFTER successful persistence
      if (domainEvents.length > 0) {
        try {
          this._log('debug', 'Publishing collected domain events', {
            id: savedEvaluation.id,
            eventCount: domainEvents.length
          });
          
          // Publish the events one by one in sequence (maintaining order)
          for (const event of domainEvents) {
            await this.eventBus.publish(event.type, event.data);
          }
        } catch (eventError) {
          // Log event publishing error but don't fail the save operation
          this._log('error', 'Error publishing domain events', { 
            id: savedEvaluation.id, 
            error: eventError.message 
          });
        }
      }
      
      return savedEvaluation;
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError || 
          error instanceof EvaluationNotFoundError) {
        throw error;
      }
      
      this._log('error', 'Error saving evaluation', { 
        id: evaluation?.id,
        error: error.message, 
        stack: error.stack
      });
      
      throw new EvaluationRepositoryError(`Failed to save evaluation: ${error.message}`, {
        cause: error,
        metadata: { evaluationId: evaluation?.id }
      });
    }
  }

  /**
   * Find evaluations for a challenge
   * @param {string} challengeId - Challenge ID to find evaluations for
   * @param {string} userId - Optional user ID to filter by
   * @returns {Promise<Array<Object>>} Array of evaluation objects
   * @throws {EvaluationValidationError} If challenge ID is missing
   * @throws {EvaluationRepositoryError} If database operation fails
   */
  async findEvaluationsForChallenge(challengeId, userId = null) {
    try {
      // Validate challengeId
      this._validateRequiredParams({ challengeId }, ['challengeId']);
      
      return await this._withRetry(async () => {
        this._log('debug', 'Finding evaluations for challenge', { 
          challengeId, 
          userId: userId || 'all' 
        });
        
        let query = this.db
          .from(this.tableName)
          .select('*')
          .eq('challenge_id', challengeId);
        
        // Add user filter if specified
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        // Sort by most recent first
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) {
          throw new DatabaseError(`Failed to fetch evaluations for challenge: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'findForChallenge',
            metadata: { challengeId, userId }
          });
        }
        
        // Convert each result to a domain model
        return (data || []).map(item => {
          const camelCaseItem = this._snakeToCamel(item);
          return Evaluation.fromDatabase(camelCaseItem);
        });
      }, 'findEvaluationsForChallenge', { challengeId, userId });
    } catch (error) {
      // Map generic repository errors to domain-specific errors
      if (error instanceof ValidationError) {
        throw new EvaluationValidationError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      if (error instanceof DatabaseError) {
        throw new EvaluationRepositoryError(error.message, {
          cause: error,
          metadata: error.metadata
        });
      }
      
      // Don't rewrap domain-specific errors
      if (error instanceof EvaluationRepositoryError ||
          error instanceof EvaluationValidationError) {
        throw error;
      }
      
      this._log('error', 'Error finding evaluations for challenge', { 
        error: error.message, 
        stack: error.stack,
        challengeId, 
        userId
      });
      
      throw new EvaluationRepositoryError(`Failed to find evaluations for challenge: ${error.message}`, {
        cause: error,
        metadata: { challengeId, userId }
      });
    }
  }

  /**
   * Find evaluation by ID
   * @param {string} id - Evaluation ID
   * @returns {Promise<Evaluation|null>} Evaluation object or null
   */
  findById(id) {
    return this.getEvaluationById(id);
  }

  /**
   * Save an evaluation
   * @param {Evaluation} evaluation - Evaluation to save
   * @returns {Promise<Evaluation>} Saved evaluation
   */
  save(evaluation) {
    return this.saveEvaluation(evaluation);
  }

  /**
   * Find a single evaluation by user and challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Evaluation|null>} Evaluation or null
   */
  async findByUserAndChallenge(userId, challengeId) {
    const results = await this.findEvaluationsForChallenge(challengeId, userId);
    return results[0] || null;
  }
}

module.exports = EvaluationRepository;