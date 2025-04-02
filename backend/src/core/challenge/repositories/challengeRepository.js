'use strict';

import { v4 as uuidv4 } from "uuid";
import Challenge from "#app/core/challenge/models/Challenge.js";
import challengeMapper from "#app/core/challenge/mappers/ChallengeMapper.js";
import challengeSchema from "#app/core/challenge/schemas/ChallengeSchema.js";
import challengeErrors from "#app/core/challenge/errors/ChallengeErrors.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import ChallengeId from "#app/core/common/valueObjects/ChallengeId.js";
import UserId from "#app/core/common/valueObjects/UserId.js";
import Email from "#app/core/common/valueObjects/Email.js";
import FocusArea from "#app/core/common/valueObjects/FocusArea.js";
const { ChallengeSchema, ChallengeSearchSchema, SearchOptionsSchema } = challengeSchema;
const { 
    ChallengeNotFoundError, 
    ChallengePersistenceError, 
    ChallengeValidationError, 
    ChallengeRepositoryError, 
    ChallengeError 
} = challengeErrors;
// Create an error mapper for the challenge domain
const challengeErrorMapper = createErrorMapper({
    EntityNotFoundError: ChallengeNotFoundError,
    ValidationError: ChallengeValidationError,
    DatabaseError: ChallengeRepositoryError
}, ChallengeError);
/**
 * Repository for challenge data access
 * @extends BaseRepository
 */
class ChallengeRepository extends BaseRepository {
    /**
     * Create a new ChallengeRepository
     * @param {Object} [options={}] - Repository options
     * @param {Object} [options.db] - Database client
     * @param {Object} [options.logger] - Logger instance
     * @param {Object} [options.eventBus] - Event bus for domain events
     */
    constructor(options = {}) {
        super({
            db: options.db, // Expect db to be provided via dependency injection
            tableName: 'challenges',
            domainName: 'challenge',
            logger: options.logger,
            maxRetries: 3
        });
        this.eventBus = options.eventBus;
        this.validateUuids = true;
        
        // Log if db is missing
        if (!this.db) {
            this.logger?.warn('No database client provided to ChallengeRepository');
        }
        
        // Apply standardized error handling to methods
        this.findById = withRepositoryErrorHandling(
            this.findById.bind(this),
            {
                methodName: 'findById',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.findByUserId = withRepositoryErrorHandling(
            this.findByUserId.bind(this),
            {
                methodName: 'findByUserId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.findRecentByUserId = withRepositoryErrorHandling(
            this.findRecentByUserId.bind(this),
            {
                methodName: 'findRecentByUserId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        // REMOVED: Method findByUserEmail does not exist on this class
        // this.findByUserEmail = withRepositoryErrorHandling(
        //     this.findByUserEmail.bind(this),
        //     {
        //         methodName: 'findByUserEmail',
        //         domainName: this.domainName,
        //         logger: this.logger,
        //         errorMapper: challengeErrorMapper
        //     }
        // );
        
        // REMOVED: Method findRecentByUserEmail does not exist on this class
        // this.findRecentByUserEmail = withRepositoryErrorHandling(
        //     this.findRecentByUserEmail.bind(this),
        //     {
        //         methodName: 'findRecentByUserEmail',
        //         domainName: this.domainName,
        //         logger: this.logger,
        //         errorMapper: challengeErrorMapper
        //     }
        // );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this),
            {
                methodName: 'save',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.update = withRepositoryErrorHandling(
            this.update.bind(this),
            {
                methodName: 'update',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.delete = withRepositoryErrorHandling(
            this.delete.bind(this),
            {
                methodName: 'delete',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.search = withRepositoryErrorHandling(
            this.search.bind(this),
            {
                methodName: 'search',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.findByFocusAreaId = withRepositoryErrorHandling(
            this.findByFocusAreaId.bind(this),
            {
                methodName: 'findByFocusAreaId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.findAll = withRepositoryErrorHandling(
            this.findAll.bind(this),
            {
                methodName: 'findAll',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
    }
    /**
     * Find a challenge by its ID
     * @param {string|ChallengeId} idOrIdVO - Challenge ID or ChallengeId value object
     * @param {boolean} throwIfNotFound - Whether to throw if not found
     * @returns {Promise<Challenge|null>} Challenge object or null if not found
     * @throws {ChallengeNotFoundError} If challenge not found and throwIfNotFound is true
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findById(idOrIdVO, throwIfNotFound = false) {
        // Handle value object if provided
        const id = idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO;
        
        this._validateId(id);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding challenge by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch challenge: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id }
                });
            }
            if (!data) {
                this._log('debug', 'Challenge not found', { id });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`Challenge with ID ${id} not found`, {
                        entityId: id,
                        entityType: this.domainName
                    });
                }
                return null;
            }
            // const challengeData = this._snakeToCamel(data); // Mapper handles this
            return challengeMapper.toDomain(data); // Pass raw data to mapper
        }, 'findById', { id });
    }
    /**
     * Find multiple challenges by their IDs
     * 
     * Efficiently retrieves multiple challenges in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of challenge IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findByIds(ids, options = {}) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            // Map database records to domain objects using mapper
            const challenges = challengeMapper.toDomainCollection(records);
            
            // If include options are specified, handle eager loading
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(challenges, options.include);
            }
            
            return challenges;
        } catch (error) {
            this._log('error', 'Error finding challenges by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(`Failed to fetch challenges by IDs: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByIds'
            });
        }
    }
    
    /**
     * Load related entities for a collection of challenges
     * Private helper method for implementing eager loading
     * 
     * @param {Array<Challenge>} challenges - Array of challenge objects
     * @param {Array<string>} include - Array of entity types to include
     * @returns {Promise<void>}
     * @private
     */
    async _loadRelatedEntities(challenges, include) {
        // No-op if no challenges
        if (!challenges || challenges.length === 0) {
            return;
        }
        
        // Process each include option
        for (const entityType of include) {
            switch (entityType) {
                case 'focusArea':
                    // Extract focus area IDs
                    const focusAreaIds = challenges
                        .map(c => c.focusAreaId)
                        .filter(id => !!id);
                        
                    if (focusAreaIds.length > 0) {
                        if (!this.container) {
                            this.logger?.warn('Cannot load related entities (focusAreas) - DI container not provided', {
                                method: '_loadRelatedEntities',
                                relationshipType: 'focusArea'
                            });
                            // Set empty focusArea references and skip loading
                            challenges.forEach(challenge => {
                                challenge.focusArea = null;
                            });
                            break;
                        }
                        
                        // Get repository from the container
                        const focusAreaRepo = this.container.get('focusAreaRepository');
                        
                        // Batch load all focus areas
                        const focusAreas = await focusAreaRepo.findByIds(focusAreaIds);
                        
                        // Create lookup map
                        const focusAreaMap = focusAreas.reduce((map, fa) => {
                            map[fa.id] = fa;
                            return map;
                        }, {});
                        
                        // Attach focus areas to challenges
                        challenges.forEach(challenge => {
                            if (challenge.focusAreaId) {
                                challenge.focusArea = focusAreaMap[challenge.focusAreaId] || null;
                            }
                        });
                    }
                    break;
                    
                // Add other entity types as needed
                // case 'user':
                // case 'evaluations':
                // etc.
            }
        }
    }
    /**
     * Find challenges by user ID
     * 
     * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
     * Only used for read operations and does not modify data across aggregate boundaries.
     * Justified for user dashboards and challenge history views where user context is required.
     * 
     * @param {string|UserId} userIdOrIdVO - User ID or UserId value object
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of results
     * @param {number} options.offset - Offset for pagination
     * @param {string} options.status - Filter by status
     * @param {string} options.sortBy - Field to sort by
     * @param {string} options.sortDir - Sort direction (asc/desc)
     * @param {Array<string>} options.include - Related entities to include (e.g., ['focusArea', 'user'])
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findByUserId(userIdOrIdVO, options = {}) {
        // Handle value object if provided
        const userId = userIdOrIdVO instanceof UserId ? userIdOrIdVO.value : userIdOrIdVO;
        
        this._validateRequiredParams({ userId }, ['userId']);
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        return await this._withRetry(async () => {
            this._log('debug', 'Finding challenges by user ID', { userId, options });
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId);
            if (status) {
                query = query.eq('status', status);
            }
            const dbSortBy = this._camelToSnakeField(sortBy);
            query = query
                .order(dbSortBy, { ascending: sortDir === 'asc' })
                .range(offset, offset + limit - 1);
            const { data, error } = await query;
            if (error) {
                throw new DatabaseError(`Failed to fetch challenges by user ID: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserId',
                    metadata: { userId, options }
                });
            }
            
            // Map database records to domain objects using mapper
            const challenges = challengeMapper.toDomainCollection(data || []);
            
            // Handle eager loading if specified in options
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(challenges, options.include);
            }
            
            return challenges;
        }, 'findByUserId', { userId, options });
    }
    /**
     * Find recent challenges by user ID
     * 
     * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
     * Only used for read operations and provides a simplified interface for the common case
     * of retrieving recent challenges for a user.
     * 
     * @param {string|UserId} userIdOrIdVO - User ID or UserId value object
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findRecentByUserId(userIdOrIdVO, limit = 5) {
        return this.findByUserId(userIdOrIdVO, { 
            limit, 
            sortBy: 'createdAt', 
            sortDir: 'desc' 
        });
    }
    /**
     * Save a challenge to the database
     * @param {Challenge} challenge - Challenge to save
     * @returns {Promise<Challenge>} Saved challenge
     * @throws {ChallengeValidationError} If challenge data fails validation
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async save(challenge) {
        // Validate challenge object
        if (!challenge || !(challenge instanceof Challenge)) {
            throw new ValidationError('Invalid challenge object', {
                entityType: this.domainName,
                operation: 'save'
            });
        }
        
        // Extract domain events before saving
        const domainEvents = challenge.getDomainEvents ? challenge.getDomainEvents() : [];
        
        // Clear events from the entity to prevent double publishing
        if (challenge.clearDomainEvents) {
            challenge.clearDomainEvents();
        }
        
        // Use withTransaction to ensure events are only published after successful commit
        // and cache invalidation occurs appropriately
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Saving challenge', { 
                id: challenge.id,
                title: challenge.title,
                isUpdate: Boolean(challenge.id)
            });
            
            // Validate challenge data using domain model's method
            try {
                challenge.validate(); 
            } catch(validationError) {
                throw new ChallengeValidationError(`Validation failed before save: ${validationError.message}`, {
                    cause: validationError
                });
            }
            
            // Prepare data for database using mapper
            const challengeData = challengeMapper.toPersistence(challenge);
            let data;
            const isUpdate = !!challenge.id; // Determine if it's an update

            if (isUpdate) {
                // Update existing challenge
                const { data: updateData, error: updateError } = await transaction
                    .from(this.tableName)
                    .update(challengeData)
                    .eq('id', challenge.id)
                    .select()
                    .single();
                    
                if (updateError) {
                    throw new DatabaseError(`Failed to update challenge: ${updateError.message}`, {
                        cause: updateError,
                        entityType: this.domainName,
                        operation: 'update',
                        metadata: { challengeId: challenge.id }
                    });
                }
                data = updateData;
            }
            else {
                // Create new challenge
                this._log('debug', 'Creating new challenge', { id: challenge.id });
                const { data: insertData, error: insertError } = await transaction
                    .from(this.tableName)
                    .insert(challengeData)
                    .select()
                    .single();
                    
                if (insertError) {
                    throw new DatabaseError(`Failed to create challenge: ${insertError.message}`, {
                        cause: insertError,
                        entityType: this.domainName,
                        operation: 'create',
                        metadata: { challengeId: challenge.id }
                    });
                }
                data = insertData;
            }
            
            this._log('debug', 'Saved challenge', {
                id: data.id, // Use ID from returned data
                title: data.title || challenge.title
            });
            
            // Convert result back using mapper
            const savedChallenge = challengeMapper.toDomain(data);
            
            // If no domain events were collected BUT this was a create operation, add default event
            if (domainEvents.length === 0 && !isUpdate) {
                 domainEvents.push({
                    type: EventTypes.CHALLENGE_CREATED,
                    data: {
                        challengeId: savedChallenge.id,
                        userId: savedChallenge.userId,
                        challengeType: savedChallenge.challengeType,
                        focusArea: savedChallenge.focusArea
                    },
                    metadata: { timestamp: new Date().toISOString() }
                });
            }
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedChallenge,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Explicitly enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use the repository's cache invalidator
        });
    }
    /**
     * Update a challenge in the database
     * @param {string|ChallengeId} idOrIdVO - Challenge ID or ChallengeId value object
     * @param {Object} updateData - Data to update
     * @returns {Promise<Challenge>} Updated challenge
     * @throws {ChallengeNotFoundError} If challenge not found
     * @throws {ChallengeValidationError} If update data fails validation
     * @throws {ChallengePersistenceError} If database operation fails
     */
    async update(idOrIdVO, updateData) {
        try {
            // Handle value object if provided
            const id = idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO;
            
            // Validate ID
            this._validateId(id);
            // Get existing challenge
            const existingChallenge = await this.findById(id, true);
            // Update the challenge with new data
            const updatedChallenge = existingChallenge.update(updateData);
            // Save the updated challenge
            return await this.save(updatedChallenge);
        }
        catch (error) {
            // Pass through specific domain errors
            if (error instanceof ChallengeNotFoundError ||
                error instanceof ChallengeValidationError ||
                error instanceof ChallengePersistenceError) {
                throw error;
            }
            this._log('error', 'Error updating challenge', {
                id: idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO,
                error: error.message,
                stack: error.stack
            });
            throw new ChallengePersistenceError(`Failed to update challenge: ${error.message}`, {
                cause: error,
                metadata: { id: idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO }
            });
        }
    }
    /**
     * Delete a challenge from the database
     * @param {string|ChallengeId} idOrIdVO - Challenge ID to delete
     * @returns {Promise<boolean>} True if deleted, false if not found
     * @throws {ChallengeValidationError} If challenge ID is invalid
     * @throws {ChallengePersistenceError} If database operation fails
     */
    async delete(idOrIdVO) {
        // Handle value object if provided
        const id = idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO;
        
        // Validate ID
        this._validateId(id);
        
        // Check if challenge exists and get its data for the event
        const challenge = await this.findById(id, true); // Ensures ChallengeNotFound is thrown if absent
        
        // Use withTransaction to ensure events are only published after successful commit
        // and cache is properly invalidated
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting challenge', { id });
            
            const { error } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', id);
                
            if (error) {
                throw new DatabaseError(`Failed to delete challenge: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            // Add domain event for deletion using the entity
            challenge.addDomainEvent(EventTypes.CHALLENGE_DELETED, {
                    challengeId: id,
                    userId: challenge.userId,
                    challengeType: challenge.challengeType,
                    focusArea: challenge.focusArea
                    // timestamp added automatically by addDomainEvent
                });
            
            // Collect domain events from the entity
            const domainEvents = challenge.getDomainEvents();
            challenge.clearDomainEvents(); // Clear events after collecting
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: true, // Deletion was successful if no DB error occurred
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Explicitly enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use the repository's cache invalidator
        });
    }
    /**
     * Search challenges with filters
     * @param {Object} filters - Search filters
     * @param {string} [filters.userId] - Filter by user ID
     * @param {string} [filters.focusAreaId] - Filter by focus area ID
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.challengeType] - Filter by challenge type
     * @param {string} [filters.difficulty] - Filter by difficulty
     * @param {Date|string} [filters.createdAfter] - Filter by creation date (after)
     * @param {Date|string} [filters.createdBefore] - Filter by creation date (before)
     * @param {Object} options - Query options
     * @param {number} [options.limit=10] - Maximum number of results
     * @param {number} [options.offset=0] - Offset for pagination
     * @param {string} [options.sortBy='createdAt'] - Field to sort by
     * @param {string} [options.sortDir='desc'] - Sort direction (asc/desc)
     * @returns {Promise<{results: Array<Challenge>, total: number}>} Search results with total count
     * @throws {ChallengeValidationError} If search parameters are invalid
     * @throws {ChallengePersistenceError} If database operation fails
     */
    async search(filters = {}, options = {}) {
        try {
            const filterResult = ChallengeSearchSchema.safeParse(filters);
            if (!filterResult.success) {
                throw new ValidationError(`Invalid search filters: ${filterResult.error.message}`, {
                    entityType: this.domainName,
                    validationErrors: filterResult.error.flatten()
                });
            }
            const optionsResult = SearchOptionsSchema.safeParse(options);
            if (!optionsResult.success) {
                throw new ValidationError(`Invalid search options: ${optionsResult.error.message}`, {
                    entityType: this.domainName,
                    validationErrors: optionsResult.error.flatten()
                });
            }
            const { userId, focusArea, difficulty, challengeType, status, searchTerm } = filterResult.data;
            const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc' } = optionsResult.data;
            const result = await this._withRetry(async () => {
                this._log('debug', 'Searching challenges', { filters, options });
                let query = this.db
                    .from(this.tableName)
                    .select('* ', { count: 'exact' }); // Fetch count for pagination
                // Apply filters
                if (userId) {
                    query = query.eq('user_id', userId);
                }
                if (focusArea) {
                    query = query.eq('focus_area', focusArea);
                }
                if (difficulty) {
                    query = query.eq('difficulty', difficulty);
                }
                if (challengeType) {
                    query = query.eq('challenge_type', challengeType);
                }
                if (status) {
                    query = query.eq('status', status);
                }
                if (searchTerm) {
                    query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
                }
                // Apply sorting and pagination
                const dbSortBy = this._camelToSnakeField(sortBy);
                query = query
                    .order(dbSortBy, { ascending: sortDir === 'asc' })
                    .range(offset, offset + limit - 1);

                const { data, error, count } = await query;

                if (error) {
                    throw new DatabaseError(`Failed to search challenges: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'search'
                    });
                }

                const results = challengeMapper.toDomainCollection(data || []);
                return { results, total: count || 0 };

            }, 'search', { filters, options });

            return result;

        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            this._log('error', 'Unexpected error searching challenges', { 
                error: error.message, 
                stack: error.stack, 
                filters, 
                options 
            });
            throw new ChallengePersistenceError(`Failed to search challenges: ${error.message}`, {
                cause: error,
                metadata: { filters, options }
            });
        }
    }
    /**
     * Find challenges by focus area ID
     * 
     * NOTE: This is a cross-aggregate query that links Challenges to Focus Areas.
     * This is a reasonable query for domain organization as focus areas are
     * a core classification property for challenges.
     * 
     * @param {string|FocusArea} focusAreaId - Focus area ID
     * @param {Object} options - Query options
     * @returns {Promise<Array<Challenge>>} Array of challenges
     */
    findByFocusAreaId(focusAreaId, options = {}) {
        return this.search({ focusArea: focusAreaId }, options);
    }
    /**
     * Find all challenges with optional filtering
     * @param {Object} [options={}] - Query options
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.offset] - Offset for pagination
     * @param {string} [options.status] - Filter by status
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengePersistenceError} If database operation fails
     */
    async findAll(options = {}) {
        // Using search without filters to get all, respecting options
        const { results, total } = await this.search({}, options);
        return results; // Or return { results, total } if needed
    }
    /**
     * Helper method to convert camelCase field name to snake_case
     * @param {string} field - Field name in camelCase
     * @returns {string} Field name in snake_case
     */
    _camelToSnakeField(field) {
        return field.replace(/([A-Z])/g, '_$1').toLowerCase();
    }
}

// Export the class for DI registration and the error class.
export { ChallengeRepository, ChallengeRepositoryError };
export default ChallengeRepository;
