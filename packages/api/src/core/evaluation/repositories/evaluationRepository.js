"../../../infra/db/supabaseClient.js;
""../../../evaluation/models/Evaluation.js70;
""../../../evaluation/schemas/EvaluationSchema.js137;
import { v4 as uuidv4 } from ""uuid";
"../../../common/events/domainEvents.js282;
""../../../infra/repositories/BaseRepository.js349;
""../../../evaluation/errors/EvaluationErrors.js482;
""../../../infra/errors/errorStandardization.js643;
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
     * @param {string} options.sort - Sort field
     * @param {string} options.order - Sort order
     * @param {number} options.limit - Maximum number of results
     * @param {number} options.offset - Offset for pagination
     * @returns {Promise<Array<Object>>} Array of evaluation objects
     */
    async findEvaluationsForUser(userId, options = {}) {
        // Validate userId
        this._validateRequiredParams({ userId }, ['userId']);
        
        return await this._withRetry(async () => {
            this._log('debug', 'Finding evaluations for user', { userId, options });
            
            // Setup query
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId);
                
            // Apply sorting (default to created_at descending)
            const sortField = this._camelToSnake(options.sort || 'createdAt');
            const sortOrder = options.order || 'desc';
            query = query.order(sortField, { ascending: sortOrder === 'asc' });
            
            // Apply pagination if specified
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.offset(options.offset);
            }
            
            // Execute query
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
export default EvaluationRepository;
"