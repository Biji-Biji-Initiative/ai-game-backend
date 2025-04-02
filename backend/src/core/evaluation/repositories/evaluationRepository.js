'use strict';

import Evaluation from "#app/core/evaluation/models/Evaluation.js";
import { EvaluationSchema, EvaluationUpdateSchema } from "#app/core/evaluation/schemas/EvaluationSchema.js";
import { v4 as uuidv4 } from "uuid";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationRepositoryError } from "#app/core/evaluation/errors/EvaluationErrors.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import evaluationMapper from "#app/core/evaluation/mappers/EvaluationMapper.js";

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
            db: options.db,
            tableName: 'evaluations',
            domainName: 'evaluation',
            logger: options.logger,
            maxRetries: 3
        });
        this.eventBus = options.eventBus;
        this.validateUuids = true;
        
        // Apply standardized error handling to public methods
        this.create = withRepositoryErrorHandling(
            this.create.bind(this), 
            {
                methodName: 'create',
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
        
        this.update = withRepositoryErrorHandling(
            this.update.bind(this), 
            {
                methodName: 'update',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.delete = withRepositoryErrorHandling(
            this.delete.bind(this), 
            {
                methodName: 'delete',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationErrorMapper
            }
        );
        
        this.findByUserId = withRepositoryErrorHandling(
            this.findByUserId.bind(this), 
            {
                methodName: 'findByUserId',
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
        
        this.findByChallengeId = withRepositoryErrorHandling(
            this.findByChallengeId.bind(this), 
            {
                methodName: 'findByChallengeId',
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

        // Alias older method names to new ones for potential backward compatibility
        this.createEvaluation = this.create;
        this.getEvaluationById = this.findById;
        this.updateEvaluation = this.update;
        this.deleteEvaluation = this.delete;
        this.findEvaluationsForUser = this.findByUserId;
        this.findEvaluationsForChallenge = this.findByChallengeId;
    }

    /**
     * Helper method to validate required parameters
     * @param {Object} params - Parameters to validate
     * @param {Array<string>} required - List of required parameter names
     * @throws {ValidationError} If any required parameter is missing
     * @private
     */
    _validateRequiredParams(params, required) {
        if (!params) {
            throw new ValidationError('Parameters object is required', {
                entityType: this.domainName,
                operation: 'validateParams'
            });
        }

        const missing = required.filter(param => !params[param]);
        if (missing.length > 0) {
            throw new ValidationError(`Missing required parameters: ${missing.join(', ')}`, {
                entityType: this.domainName,
                validationErrors: missing.reduce((acc, param) => {
                    acc[param] = 'Required parameter is missing';
                    return acc;
                }, {}),
                operation: 'validateParams'
            });
        }
    }

    /**
     * Convert camelCase field name to snake_case for database queries
     * @param {string} field - Field name in camelCase
     * @returns {string} Field name in snake_case
     * @private
     */
    _camelToSnakeField(field) {
        return field.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    /**
     * Create a new evaluation
     * @param {Object} evaluationData - Evaluation domain data (camelCase)
     * @returns {Promise<Evaluation>} Created evaluation object
     * @throws {EvaluationValidationError} If evaluation data is invalid
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async create(evaluationData) {
        if (!evaluationData) {
            throw new ValidationError('Evaluation data is required', {
                entityType: this.domainName,
                operation: 'create'
            });
        }
            
        // Create domain object first for validation and event handling
        const evaluation = new Evaluation({
            ...evaluationData,
            id: evaluationData.id || uuidv4(), // Ensure ID exists
            createdAt: evaluationData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { EventTypes: EventTypes });

        // Validate the domain object (optional, model constructor might already do this)
        // evaluation.validate(); 

        // Add creation event (domain object should handle this ideally)
        evaluation.addDomainEvent(EventTypes.EVALUATION_CREATED, {
            evaluationId: evaluation.id,
            userId: evaluation.userId,
            challengeId: evaluation.challengeId,
            score: evaluation.score,
            timestamp: evaluation.createdAt
        });
        
        const domainEvents = evaluation.getDomainEvents();
        evaluation.clearDomainEvents(); // Clear before passing to save

        // Use save method which handles transaction and mapping
        const { result: savedEvaluation } = await this.save(evaluation, domainEvents);
        return savedEvaluation;
    }
    /**
     * Get evaluation by ID
     * @param {string} evaluationId - Evaluation ID
     * @param {boolean} throwIfNotFound - Whether to throw an error if not found
     * @returns {Promise<Evaluation>} Evaluation object
     * @throws {EvaluationNotFoundError} If evaluation not found and throwIfNotFound is true
     * @throws {EvaluationValidationError} If evaluation ID is missing
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async findById(evaluationId, throwIfNotFound = false) {
        this._validateId(evaluationId);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding evaluation by ID', { evaluationId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', evaluationId)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to retrieve evaluation: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
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
            
            // Use mapper to convert database record to domain entity
            return evaluationMapper.toDomain(data, { EventTypes: EventTypes });
        }, 'findById', { evaluationId });
    }
    /**
     * Update an existing evaluation
     * @param {string} evaluationId - ID of the evaluation to update
     * @param {Object} updateData - Data to update (camelCase)
     * @returns {Promise<Evaluation>} Updated evaluation object
     * @throws {EvaluationNotFoundError} If evaluation not found
     * @throws {EvaluationValidationError} If update data is invalid
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async update(evaluationId, updateData) {
         this._validateId(evaluationId);
         if (!updateData || Object.keys(updateData).length === 0) {
             throw new ValidationError('Update data is required', {
                 entityType: this.domainName,
                 operation: 'update'
             });
         }
        
         // Fetch the existing evaluation
         const existingEvaluation = await this.findById(evaluationId, true); // Throw if not found

         // Apply updates using domain model method
         const updatedEvaluation = existingEvaluation.update(updateData);

         // Use save method to persist changes and handle events/transactions
         const { result: savedEvaluation } = await this.save(updatedEvaluation); 
         return savedEvaluation;
    }
    /**
     * Delete an evaluation by ID
     * @param {string} evaluationId - Evaluation ID
     * @returns {Promise<boolean>} True if deleted successfully
     * @throws {EvaluationNotFoundError} If evaluation not found
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async delete(evaluationId) {
        this._validateId(evaluationId);

        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting evaluation', { evaluationId });

            // Fetch the existing evaluation for event data
            const { data: existingRecord, error: fetchError } = await transaction
                .from(this.tableName)
                .select('*')
                .eq('id', evaluationId)
                .maybeSingle();

            if (fetchError) {
                throw new DatabaseError(`Failed to fetch evaluation for deletion: ${fetchError.message}`, {
                    cause: fetchError, entityType: this.domainName, operation: 'delete.fetch', metadata: { evaluationId }
                });
            }

            if (!existingRecord) {
                throw new EntityNotFoundError(`Evaluation with ID ${evaluationId} not found`, {
                    entityId: evaluationId, entityType: this.domainName
                });
            }
            
            // Convert to domain entity to generate events
            const existingEvaluation = evaluationMapper.toDomain(existingRecord, { EventTypes: EventTypes });

            // Collect domain events from the entity
            const domainEvents = [];
            if (existingEvaluation?.addDomainEvent) {
                existingEvaluation.addDomainEvent(EventTypes.EVALUATION_DELETED, {
                    evaluationId: evaluationId,
                    userId: existingEvaluation.userId,
                    challengeId: existingEvaluation.challengeId,
                    timestamp: new Date().toISOString()
                });
                domainEvents.push(...existingEvaluation.getDomainEvents());
                existingEvaluation.clearDomainEvents(); // Clear events after collecting
            }

            // Perform the delete operation
            const { error } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', evaluationId);

            if (error) {
                throw new DatabaseError(`Failed to delete evaluation: ${error.message}`, {
                    cause: error, entityType: this.domainName, operation: 'delete', metadata: { evaluationId }
                });
            }

            this._log('info', 'Evaluation deleted successfully', { evaluationId });

            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Find evaluations for a specific user
     * @param {string} userId - User ID
     * @param {Object} options - Query options (limit, offset, sortBy, sortDir)
     * @returns {Promise<Array<Evaluation>>} List of evaluations
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async findByUserId(userId, options = {}) {
        this._validateRequiredParams({ userId }, ['userId']);
        const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc' } = options;

        return await this._withRetry(async () => {
            this._log('debug', 'Finding evaluations for user', { userId, options });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .order(this._camelToSnakeField(sortBy), { ascending: sortDir === 'asc' })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new DatabaseError(`Failed to fetch evaluations for user: ${error.message}`, {
                    cause: error, entityType: this.domainName, operation: 'findByUserId', metadata: { userId }
                });
            }

            // Use mapper to convert results
            return evaluationMapper.toDomainCollection(data || [], { EventTypes: EventTypes });
        }, 'findByUserId', { userId, options });
    }
    /**
     * Save an evaluation (create or update)
     * @param {Evaluation} evaluation - Evaluation domain object
     * @param {Array} [initialDomainEvents=[]] - Optional initial events (e.g., from create)
     * @returns {Promise<Object>} Object containing result: saved Evaluation and domainEvents
     * @throws {EvaluationValidationError} If validation fails
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async save(evaluation, initialDomainEvents = []) {
        if (!evaluation || !(evaluation instanceof Evaluation)) {
            throw new ValidationError('Evaluation object must be an instance of Evaluation', {
                entityType: this.domainName,
                operation: 'save'
            });
        }

        // Ensure EventTypes are available if needed for event generation
        if (!evaluation.EventTypes) {
             evaluation.EventTypes = EventTypes;
        }

        // Collect domain events generated by the model before saving
        const modelDomainEvents = evaluation.getDomainEvents ? evaluation.getDomainEvents() : [];
        const domainEventsToPublish = [...initialDomainEvents, ...modelDomainEvents];
        
        // Clear events from the entity to prevent double publishing
        if (evaluation.clearDomainEvents) {
            evaluation.clearDomainEvents();
        }

        return this.withTransaction(async (transaction) => {
            const now = new Date().toISOString();
            if (!evaluation.createdAt) evaluation.createdAt = now;
            evaluation.updatedAt = now;
            if (!evaluation.id) evaluation.id = uuidv4();
            
            // Convert domain object to persistence format using mapper
            const dbData = evaluationMapper.toPersistence(evaluation);
            if (!dbData) {
                 throw new ValidationError('Failed to map evaluation to persistence format', {
                    entityType: this.domainName,
                    operation: 'save'
                 });
            }

            this._log('debug', 'Saving evaluation', { id: evaluation.id });

            // Upsert using the transaction
            const { data, error } = await transaction
                .from(this.tableName)
                .upsert(dbData)
                .select()
                .single();

            if (error) {
                throw new DatabaseError(`Failed to save evaluation: ${error.message}`, {
                    cause: error, entityType: this.domainName, operation: 'save', metadata: { id: evaluation.id }
                });
            }

            this._log('info', 'Evaluation saved successfully', { id: data.id });

            // Convert result back to domain object using mapper
            const savedEvaluation = evaluationMapper.toDomain(data, { EventTypes: EventTypes });
            
            // Return result and collected domain events
            return {
                result: savedEvaluation,
                domainEvents: domainEventsToPublish
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Find evaluations for a specific challenge, optionally filtered by user
     * @param {string} challengeId - Challenge ID
     * @param {string} [userId=null] - Optional User ID to filter by
     * @returns {Promise<Array<Evaluation>>} List of evaluations
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async findByChallengeId(challengeId, userId = null) {
        this._validateRequiredParams({ challengeId }, ['challengeId']);
        if (userId) this._validateId(userId);

        return await this._withRetry(async () => {
            this._log('debug', 'Finding evaluations for challenge', { challengeId, userId });
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('challenge_id', challengeId);
            
            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                throw new DatabaseError(`Failed to fetch evaluations for challenge: ${error.message}`, {
                    cause: error, entityType: this.domainName, operation: 'findByChallengeId', metadata: { challengeId, userId }
                });
            }

            // Use mapper to convert results
            return evaluationMapper.toDomainCollection(data || [], { EventTypes: EventTypes });
        }, 'findByChallengeId', { challengeId, userId });
    }

    /**
     * Find evaluation by user and challenge IDs
     * @param {string} userId - User ID
     * @param {string} challengeId - Challenge ID
     * @returns {Promise<Evaluation|null>} Evaluation object or null
     * @throws {EvaluationRepositoryError} If database operation fails
     */
    async findByUserAndChallenge(userId, challengeId) {
        this._validateRequiredParams({ userId, challengeId }, ['userId', 'challengeId']);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding evaluation by user and challenge', { userId, challengeId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('challenge_id', challengeId)
                .maybeSingle(); // Expecting at most one

            if (error) {
                throw new DatabaseError(`Failed to fetch evaluation by user/challenge: ${error.message}`, {
                    cause: error, entityType: this.domainName, operation: 'findByUserAndChallenge', metadata: { userId, challengeId }
                });
            }

            if (!data) {
                this._log('debug', 'Evaluation not found for user/challenge', { userId, challengeId });
                return null;
            }

            // Use mapper to convert result
            return evaluationMapper.toDomain(data, { EventTypes: EventTypes });
        }, 'findByUserAndChallenge', { userId, challengeId });
    }
}

export { EvaluationRepository };
export default EvaluationRepository;
