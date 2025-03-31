import { supabaseClient } from "@/core/infra/db/supabaseClient.js";
import evaluation from "@/core/evaluation/models/Evaluation.js";
import { EvaluationSchema, EvaluationUpdateSchema } from "@/core/evaluation/schemas/EvaluationSchema.js";
import { v4 as uuidv4 } from "uuid";
import domainEvents from "@/core/common/events/domainEvents.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "@/core/infra/repositories/BaseRepository.js";
import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationRepositoryError } from "@/core/evaluation/errors/EvaluationErrors.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "@/core/infra/errors/errorStandardization.js";
'use strict';
const { Evaluation } = evaluation;
const { eventBus, EventTypes } = domainEvents;
// Create an error mapper for the evaluation domain
const evaluationErrorMapper = createErrorMapper({
    EntityNotFoundError: EvaluationNotFoundError,
    ValidationError: EvaluationValidationError,
    DatabaseError: EvaluationRepositoryError
}, EvaluationError);
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
        
        // Apply standardized error handling to public methods
        this.createEvaluation = withRepositoryErrorHandling(
            this.createEvaluation.bind(this), 
            {
                methodName: 'createEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.getEvaluationById = withRepositoryErrorHandling(
            this.getEvaluationById.bind(this), 
            {
                methodName: 'getEvaluationById',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.updateEvaluation = withRepositoryErrorHandling(
            this.updateEvaluation.bind(this), 
            {
                methodName: 'updateEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.deleteEvaluation = withRepositoryErrorHandling(
            this.deleteEvaluation.bind(this), 
            {
                methodName: 'deleteEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.findEvaluationsForUser = withRepositoryErrorHandling(
            this.findEvaluationsForUser.bind(this), 
            {
                methodName: 'findEvaluationsForUser',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.saveEvaluation = withRepositoryErrorHandling(
            this.saveEvaluation.bind(this), 
            {
                methodName: 'saveEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.findEvaluationsForChallenge = withRepositoryErrorHandling(
            this.findEvaluationsForChallenge.bind(this), 
            {
                methodName: 'findEvaluationsForChallenge',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.findById = withRepositoryErrorHandling(
            this.findById.bind(this), 
            {
                methodName: 'findById',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this), 
            {
                methodName: 'save',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.findByUserAndChallenge = withRepositoryErrorHandling(
            this.findByUserAndChallenge.bind(this), 
            {
                methodName: 'findByUserAndChallenge',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
    }
    /**
     * Create a new evaluation
     * @param {Object} evaluationData - Evaluation data
     * @returns {Promise<Object>} Created evaluation object
     * @throws {EvaluationValidationError} If evaluation data is invalid
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async createEvaluation(evaluationData) {
        // Validation logic is now outside try/catch since error handling is done by the wrapper
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
            
        // Create event to publish after successful persistence
        const domainEvents = [{
            type: EventTypes.EVALUATION_CREATED,
            payload: {
                evaluationId: data.id,
                userId: data.userId,
                challengeId: data.challengeId,
                score: data.score,
                timestamp: data.createdAt
            }
        }];
        
        // Use transaction to ensure events are only published after commit
        return await this.withTransaction(async (transaction) => {
            this._log('debug', 'Creating evaluation', {
                id: data.id,
                userId: data.userId,
                challengeId: data.challengeId
            });
                
            const { data: result, error } = await transaction
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
            
            return {
                result: createdEvaluation,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
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
        }
        catch (error) {
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
                    
    // Find evaluation entity and add domain event
    const evaluationEntity = await this.findById(evaluationId);
    if (evaluationEntity) {
      evaluationEntity.addDomainEvent(EventTypes.EVALUATION_UPDATED, {
        evaluationId: updatedEvaluation.id,
        userId: updatedEvaluation.userId,
        challengeId: updatedEvaluation.challengeId,
        score: updatedEvaluation.score,
        timestamp: updatedEvaluation.updatedAt
      });
      
      // Save entity with events
      await this.save(evaluationEntity);
    }
                    this._log('debug', 'Published evaluation updated event', {
                        id: updatedEvaluation.id
                    });
                }
                catch (eventError) {
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
        }
        catch (error) {
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
        // Validation is outside try/catch as it's handled by the wrapper
        this._validateId(evaluationId);
        
        // First get the evaluation to ensure it exists and to collect data for the event
        const evaluation = await this.getEvaluationById(evaluationId, true);
        
        // Prepare domain event
        const domainEvents = [{
            type: EventTypes.EVALUATION_DELETED,
            payload: {
                evaluationId: evaluation.id,
                userId: evaluation.userId,
                challengeId: evaluation.challengeId,
                timestamp: new Date().toISOString()
            }
        }];
        
        // Use transaction to ensure events are only published after commit
        return await this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting evaluation', { evaluationId });
            
            const { error } = await transaction
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
            
            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
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
        }
        catch (error) {
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
     * Save an evaluation domain object to the database
     * @param {Evaluation} evaluation - Evaluation domain object to save
     * @returns {Promise<Evaluation>} Updated evaluation domain object
     * @throws {EvaluationValidationError} If the evaluation object fails validation
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async saveEvaluation(evaluation) {
        // Validation logic is now outside try/catch since error handling is done by the wrapper
        if (!evaluation) {
            throw new ValidationError('Evaluation object is required', {
                entityType: this.domainName,
            });
        }
        
        if (!(evaluation instanceof Evaluation)) {
            throw new ValidationError('Object must be an Evaluation instance', {
                entityType: this.domainName,
            });
        }
        
        // Collect domain events before the operation
        const domainEvents = evaluation.getDomainEvents ? evaluation.getDomainEvents() : [];
        if (evaluation.clearDomainEvents) {
            evaluation.clearDomainEvents();
        }
        
        // Use withTransaction to ensure domain events are published only after commit
        return await this.withTransaction(async (transaction) => {
            const isUpdate = !!evaluation.id;
            const evaluationData = evaluation.toJSON ? evaluation.toJSON() : evaluation;
            
            // Always update timestamps
            evaluationData.updatedAt = new Date().toISOString();
            
            if (!isUpdate) {
                // For new evaluations
                evaluationData.id = evaluationData.id || uuidv4();
                evaluationData.createdAt = new Date().toISOString();
                
                this._log('debug', 'Creating new evaluation', { id: evaluationData.id });
                
                // Convert to snake_case for database
                const dbData = this._camelToSnake(evaluationData);
                
                const { data: result, error } = await transaction
                    .from(this.tableName)
                    .insert(dbData)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to create evaluation: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save',
                        metadata: { id: evaluationData.id }
                    });
                }
                
                // Convert back to camelCase
                const camelCaseResult = this._snakeToCamel(result);
                
                // Create domain model from database result
                const savedEvaluation = Evaluation.fromDatabase(camelCaseResult);
                
                return { 
                    result: savedEvaluation, 
                    domainEvents 
                };
            } else {
                // For existing evaluations
                this._log('debug', 'Updating existing evaluation', { id: evaluationData.id });
                
                // Convert to snake_case for database
                const dbData = this._camelToSnake(evaluationData);
                
                // Remove id from update data
                const { id, ...updateData } = dbData;
                
                const { data: result, error } = await transaction
                    .from(this.tableName)
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to update evaluation: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save',
                        metadata: { id: evaluationData.id }
                    });
                }
                
                if (!result) {
                    throw new EntityNotFoundError(`Evaluation with ID ${evaluationData.id} not found`, {
                        entityId: evaluationData.id,
                        entityType: this.domainName
                    });
                }
                
                // Convert back to camelCase
                const camelCaseResult = this._snakeToCamel(result);
                
                // Create domain model from database result
                const savedEvaluation = Evaluation.fromDatabase(camelCaseResult);
                
                return {
                    result: savedEvaluation,
                    domainEvents
                };
            }
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
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
        }
        catch (error) {
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
     * Find multiple evaluations by their IDs
     * 
     * Efficiently retrieves multiple evaluations in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of evaluation IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include
     * @returns {Promise<Array<Evaluation>>} Array of evaluations
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async findByIds(ids, options = {}) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            // Map database records to domain objects
            const evaluations = records.map(record => {
                const evaluationData = this._snakeToCamel(record);
                return Evaluation.fromDatabase(evaluationData);
            });
            
            // If include options are specified, handle eager loading
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(evaluations, options.include);
            }
            
            return evaluations;
        } catch (error) {
            this._log('error', 'Error finding evaluations by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new EvaluationRepositoryError(`Failed to fetch evaluations by IDs: ${error.message}`, {
                cause: error,
                metadata: { count: ids?.length || 0 }
            });
        }
    }
    
    /**
     * Load related entities for a collection of evaluations
     * Private helper method for implementing eager loading
     * 
     * @param {Array<Evaluation>} evaluations - Array of evaluation objects
     * @param {Array<string>} include - Array of entity types to include
     * @returns {Promise<void>}
     * @private
     */
    async _loadRelatedEntities(evaluations, include) {
        // No-op if no evaluations
        if (!evaluations || evaluations.length === 0) {
            return;
        }
        
        // Process each include option
        for (const entityType of include) {
            switch (entityType) {
                case 'challenge':
                    // Extract challenge IDs
                    const challengeIds = evaluations
                        .map(e => e.challengeId)
                        .filter(id => !!id);
                        
                    if (challengeIds.length > 0) {
                        // Get the repository from container or directly
                        const challengeRepo = this.container ? 
                            this.container.get('challengeRepository') : 
                            require('@/core/challenge/repositories/challengeRepository').default;
                            
                        // Batch load all challenges
                        const challenges = await challengeRepo.findByIds(challengeIds);
                        
                        // Create lookup map
                        const challengeMap = challenges.reduce((map, challenge) => {
                            map[challenge.id] = challenge;
                            return map;
                        }, {});
                        
                        // Attach challenges to evaluations
                        evaluations.forEach(evaluation => {
                            if (evaluation.challengeId) {
                                evaluation.challenge = challengeMap[evaluation.challengeId] || null;
                            }
                        });
                    }
                    break;
                    
                case 'user':
                    // Extract user IDs
                    const userIds = evaluations
                        .map(e => e.userId)
                        .filter(id => !!id);
                        
                    if (userIds.length > 0) {
                        // Get the repository from container or directly
                        const userRepo = this.container ? 
                            this.container.get('userRepository') : 
                            require('@/core/user/repositories/UserRepository').default;
                            
                        // Batch load all users
                        const users = await userRepo.findByIds(userIds);
                        
                        // Create lookup map
                        const userMap = users.reduce((map, user) => {
                            map[user.id] = user;
                            return map;
                        }, {});
                        
                        // Attach users to evaluations
                        evaluations.forEach(evaluation => {
                            if (evaluation.userId) {
                                evaluation.user = userMap[evaluation.userId] || null;
                            }
                        });
                    }
                    break;
            }
        }
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
export default EvaluationRepository;
