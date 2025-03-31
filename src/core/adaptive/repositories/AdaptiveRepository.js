import Recommendation from "@/core/adaptive/models/Recommendation.js";
import recommendationMapper from "@/core/adaptive/mappers/RecommendationMapper.js";
import { supabaseClient } from "@/core/infra/db/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";
import { RecommendationDatabaseSchema } from "@/core/adaptive/schemas/RecommendationSchema.js";
import { BaseRepository, ValidationError, DatabaseError } from "@/core/infra/repositories/BaseRepository.js";
import { AdaptiveNotFoundError, AdaptiveValidationError, AdaptiveRepositoryError } from "@/core/adaptive/errors/adaptiveErrors.js";
import { withRepositoryErrorHandling, createErrorMapper, createErrorCollector } from "@/core/infra/errors/errorStandardization.js";
import domainEvents from "@/core/common/events/domainEvents.js";
'use strict';

// Create an error mapper for repositories
const adaptiveRepositoryErrorMapper = createErrorMapper({
    EntityNotFoundError: AdaptiveNotFoundError,
    ValidationError: AdaptiveValidationError,
    DatabaseError: AdaptiveRepositoryError,
}, AdaptiveRepositoryError);

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
        
        // Apply standardized error handling to methods
        this.findById = withRepositoryErrorHandling(
            this.findById.bind(this),
            {
                methodName: 'findById',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
        
        this.findLatestForUser = withRepositoryErrorHandling(
            this.findLatestForUser.bind(this),
            {
                methodName: 'findLatestForUser',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
        
        this.findByUserId = withRepositoryErrorHandling(
            this.findByUserId.bind(this),
            {
                methodName: 'findByUserId',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this),
            {
                methodName: 'save',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
        
        this.delete = withRepositoryErrorHandling(
            this.delete.bind(this),
            {
                methodName: 'delete',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
        
        this.deleteAllForUser = withRepositoryErrorHandling(
            this.deleteAllForUser.bind(this),
            {
                methodName: 'deleteAllForUser',
                domainName: 'adaptive',
                logger: this.logger,
                errorMapper: adaptiveRepositoryErrorMapper
            }
        );
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
    }
    /**
     * Find latest recommendation for a user
     * @param {string} userId - User ID to find recommendations for
     * @returns {Promise<Recommendation|null>} Recommendation object or null if not found
     * @throws {AdaptiveValidationError} If userId is invalid
     * @throws {AdaptiveRepositoryError} If database operation fails
     */
    async findLatestForUser(userId) {
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
                errorCollector.collect(new ValidationError(`Invalid recommendation data: ${validationResult.error.message}`, {
                    entityType: this.domainName,
                    validationErrors: validationResult.error.flatten()
                }), `recommendation_id_${item.id}`);
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
    }
    /**
     * Save a recommendation
     * @param {Recommendation} recommendation - Recommendation to save
     * @returns {Promise<Recommendation>} Saved recommendation
     * @throws {AdaptiveValidationError} If recommendation data is invalid
     * @throws {AdaptiveRepositoryError} If database operation fails
     */
    async save(recommendation) {
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
        
        // Get domain events before persistence
        const domainEvents = recommendation.getDomainEvents ? recommendation.getDomainEvents() : [];
        
        // Clear events from the entity to prevent double publishing
        if (recommendation.clearDomainEvents) {
            recommendation.clearDomainEvents();
        }
        
        // Use withTransaction to ensure events are only published after successful commit
        return this.withTransaction(async (transaction) => {
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
            
            // Upsert recommendation data using the transaction
            const { data, error } = await transaction
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
            
            // Use mapper to convert database record to domain entity
            const savedRecommendation = recommendationMapper.toDomain(data);
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedRecommendation,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: domainEvents
        });
    }
    /**
     * Delete a recommendation by ID
     * @param {string} id - Recommendation ID to delete
     * @returns {Promise<boolean>} True if successful
     * @throws {AdaptiveValidationError} If ID is invalid
     * @throws {AdaptiveRepositoryError} If database operation fails
     */
    async delete(id) {
        this._validateId(id);
        this._log('debug', 'Deleting recommendation', { id });
        
        // Use withTransaction to ensure consistency with other operations
        return this.withTransaction(async (transaction) => {
            // First, get the recommendation to generate any needed events
            const { data: existingRec, error: fetchError } = await transaction
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (fetchError) {
                throw new DatabaseError(`Failed to fetch recommendation for deletion: ${fetchError.message}`, {
                    cause: fetchError,
                    entityType: this.domainName,
                    operation: 'delete.fetch',
                    metadata: { id }
                });
            }
            
            // Create domain event for deletion if the record exists
            const domainEvents = [];
            if (existingRec) {
                // Create a deletion event
                domainEvents.push({
                    type: 'RecommendationDeleted',
                    data: {
                        id: existingRec.id,
                        userId: existingRec.user_id
                    }
                });
            }
            
            // Delete the record
            const { error: deleteError } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', id);
            
            if (deleteError) {
                throw new DatabaseError(`Failed to delete recommendation: ${deleteError.message}`, {
                    cause: deleteError,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            this._log('info', 'Recommendation deleted successfully', { id });
            
            // Return result and domain events for publishing
            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: domainEvents
        });
    }
    /**
     * Delete all recommendations for a user
     * @param {string} userId - User ID to delete recommendations for
     * @returns {Promise<boolean>} True if successful
     * @throws {AdaptiveValidationError} If userId is invalid
     * @throws {AdaptiveRepositoryError} If database operation fails
     */
    async deleteAllForUser(userId) {
        this._validateRequiredParams({ userId }, ['userId']);
        this._log('debug', 'Deleting all recommendations for user', { userId });
        
        // Use withTransaction to ensure consistency with other operations
        return this.withTransaction(async (transaction) => {
            // First, get the recommendations to generate any needed events
            const { data: existingRecs, error: fetchError } = await transaction
                .from(this.tableName)
                .select('id')
                .eq('user_id', userId);
            
            if (fetchError) {
                throw new DatabaseError(`Failed to fetch recommendations for deletion: ${fetchError.message}`, {
                    cause: fetchError,
                    entityType: this.domainName,
                    operation: 'deleteAllForUser.fetch',
                    metadata: { userId }
                });
            }
            
            // Create domain event for bulk deletion
            const domainEvents = [];
            if (existingRecs && existingRecs.length > 0) {
                // Create a bulk deletion event
                domainEvents.push({
                    type: 'UserRecommendationsDeleted',
                    data: {
                        userId: userId,
                        count: existingRecs.length,
                        recommendationIds: existingRecs.map(r => r.id)
                    }
                });
            }
            
            // Delete the records
            const { error: deleteError } = await transaction
                .from(this.tableName)
                .delete()
                .eq('user_id', userId);
            
            if (deleteError) {
                throw new DatabaseError(`Failed to delete user recommendations: ${deleteError.message}`, {
                    cause: deleteError,
                    entityType: this.domainName,
                    operation: 'deleteAllForUser',
                    metadata: { userId }
                });
            }
            
            this._log('info', 'All user recommendations deleted successfully', { 
                userId, 
                count: existingRecs?.length || 0 
            });
            
            // Return result and domain events for publishing
            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: domainEvents
        });
    }
}
// Export class and a default instance
const adaptiveRepository = new AdaptiveRepository();

// Fix exports to ensure proper constructor import
export { AdaptiveRepository, adaptiveRepository, AdaptiveRepositoryError };
export default AdaptiveRepository;

