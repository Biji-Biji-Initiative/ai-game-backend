import { v4 as uuidv4 } from "uuid";
import Challenge from "../../challenge/models/Challenge.js";
import challengeMapper from "../../challenge/mappers/ChallengeMapper.js";
import challengeSchema from "../../challenge/schemas/ChallengeSchema.js";
import challengeErrors from "../../challenge/errors/ChallengeErrors.js";
import domainEvents from "../../common/events/domainEvents.js";
import { supabaseClient } from "../../infra/db/supabaseClient.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "../../infra/repositories/BaseRepository.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "../../infra/errors/errorStandardization.js";
import ChallengeId from "../../common/valueObjects/ChallengeId.js";
import UserId from "../../common/valueObjects/UserId.js";
import Email from "../../common/valueObjects/Email.js";
import FocusArea from "../../common/valueObjects/FocusArea.js";
'use strict';
const { ChallengeSchema, ChallengeSearchSchema, SearchOptionsSchema } = challengeSchema;
const { 
    ChallengeNotFoundError, 
    ChallengePersistenceError, 
    ChallengeValidationError, 
    ChallengeRepositoryError, 
    ChallengeError 
} = challengeErrors;
const { eventBus, EventTypes } = domainEvents;
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
            db: options.db || supabaseClient,
            tableName: 'challenges',
            domainName: 'challenge',
            logger: options.logger,
            maxRetries: 3
        });
        this.eventBus = options.eventBus || eventBus;
        this.validateUuids = true;
        
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
        
        this.findByUserEmail = withRepositoryErrorHandling(
            this.findByUserEmail.bind(this),
            {
                methodName: 'findByUserEmail',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
        this.findRecentByUserEmail = withRepositoryErrorHandling(
            this.findRecentByUserEmail.bind(this),
            {
                methodName: 'findRecentByUserEmail',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
        
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
            const challengeData = this._snakeToCamel(data);
            return challengeMapper.toDomain(challengeData);
        }, 'findById', { id });
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
            return (data || []).map(record => {
                const challengeData = this._snakeToCamel(record);
                return challengeMapper.toDomain(challengeData);
            });
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
     * Find challenges by user email
     * 
     * NOTE: This is a cross-aggregate query with stronger coupling than findByUserId.
     * It bypasses the User aggregate boundary and assumes knowledge of User attribute (email).
     * Consider using a two-step process in new code: first get userId by email,
     * then find challenges by userId for better adherence to DDD principles.
     * 
     * This method is maintained for backward compatibility and simple read scenarios.
     * 
     * @param {string|Email} emailOrEmailVO - User email or Email value object
     * @param {Object} options - Query options
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findByUserEmail(emailOrEmailVO, options = {}) {
        // Handle value object if provided
        const email = emailOrEmailVO instanceof Email ? emailOrEmailVO.value : emailOrEmailVO;
        
        this._validateRequiredParams({ email }, ['email']);
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        return await this._withRetry(async () => {
            this._log('debug', 'Finding challenges by user email', { email, options });
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('user_email', email);
            if (status) {
                query = query.eq('status', status);
            }
            const dbSortBy = this._camelToSnakeField(sortBy);
            query = query
                .order(dbSortBy, { ascending: sortDir === 'asc' })
                .range(offset, offset + limit - 1);
            const { data, error } = await query;
            if (error) {
                throw new DatabaseError(`Failed to fetch challenges by user email: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserEmail',
                    metadata: { email, options }
                });
            }
            return (data || []).map(record => {
                const challengeData = this._snakeToCamel(record);
                return challengeMapper.toDomain(challengeData);
            });
        }, 'findByUserEmail', { email, options });
    }
    /**
     * Find recent challenges by user email
     * 
     * NOTE: This is a cross-aggregate query with stronger coupling than findByUserId.
     * It inherits the same concerns as findByUserEmail. For new code, consider a two-step
     * approach using findByEmail and findByUserId instead.
     * 
     * @param {string|Email} emailOrEmailVO - User email or Email value object
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findRecentByUserEmail(emailOrEmailVO, limit = 5) {
        return this.findByUserEmail(emailOrEmailVO, { 
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
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Saving challenge', { 
                id: challenge.id,
                title: challenge.title,
                isUpdate: Boolean(challenge.id)
            });
            
            // Validate challenge data
            ChallengeSchema.parse(challenge);
            
            // Prepare data for database (convert camelCase to snake_case)
            const challengeData = this._camelToSnake(challengeMapper.toPersistence(challenge));
            let data;
            
            if (challenge.id) {
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
                id: challenge.id,
                title: challenge.title
            });
            
            const savedData = this._snakeToCamel(data);
            const savedChallenge = challengeMapper.toDomain(savedData);
            
            // If no domain events were provided but this is a new challenge, add creation event
            if (domainEvents.length === 0 && !challenge.id) {
                domainEvents.push({
                    type: EventTypes.CHALLENGE_CREATED,
                    payload: {
                        challengeId: savedChallenge.id,
                        userId: savedChallenge.userId,
                        challengeType: savedChallenge.challengeType,
                        focusArea: savedChallenge.focusArea
                    },
                    timestamp: new Date().toISOString()
                });
            }
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedChallenge,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
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
        const challenge = await this.findById(id, true);
        
        // Use withTransaction to ensure events are only published after successful commit
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
            
            // Create domain event for deletion
            const domainEvents = [{
                type: EventTypes.CHALLENGE_DELETED,
                payload: {
                    challengeId: id,
                    userId: challenge.userId,
                    challengeType: challenge.challengeType,
                    focusArea: challenge.focusArea
                },
                timestamp: new Date().toISOString()
            }];
            
            // Return both the result and the domain events for publishing after commit
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
                    .select('*');
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
                const { data, error } = await query;
                if (error) {
                    throw new DatabaseError(`Failed to search challenges: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'search',
                        metadata: { filters, options }
                    });
                }
                return {
                    results: (data || []).map(record => {
                        const challengeData = this._snakeToCamel(record);
                        return challengeMapper.toDomain(challengeData);
                    }),
                    total: data?.length || 0
                };
            }, 'search', { filters, options });
            return result;
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw new ChallengeValidationError(error.message, {
                    cause: error,
                    metadata: error.metadata
                });
            }
            if (error instanceof DatabaseError) {
                throw new ChallengePersistenceError(error.message, {
                    cause: error,
                    metadata: error.metadata
                });
            }
            if (!(error instanceof ChallengePersistenceError)) {
                this._log('error', 'Error in search', {
                    filters,
                    options,
                    error: error.message,
                    stack: error.stack
                });
                throw new ChallengePersistenceError(`Failed to search challenges: ${error.message}`, {
                    cause: error,
                    metadata: { filters, options }
                });
            }
            throw error;
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
    findAll(options = {}) {
        return this.search({}, options);
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

// Use a function to get the singleton instance (lazy initialization)
let _instance = null;
function getRepositoryInstance() {
    if (!_instance) {
        _instance = new ChallengeRepository();
    }
    return _instance;
}

// Export the singleton getter and the class
export const challengeRepository = getRepositoryInstance();
export default ChallengeRepository;
