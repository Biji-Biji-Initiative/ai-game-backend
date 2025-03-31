import { v4 as uuidv4 } from "uuid";
"../../../common/events/domainEvents.js37;
""../../../infra/db/supabaseClient.js101;
""../../../infra/repositories/BaseRepository.js171;
""../../../infra/errors/errorStandardization.js304;
""../../../infra/dataloader/DataLoaderFactory.js438;
""../../../common/valueObjects/FocusArea.js516;
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
// Get the DataLoader registry
const dataLoaderRegistry = getRegistry();
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
        
        // Create DataLoaders
        this._initDataLoaders();
        
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
        
        this.findByMultipleIds = withRepositoryErrorHandling(
            this.findByMultipleIds.bind(this),
            {
                methodName: 'findByMultipleIds',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: challengeErrorMapper
            }
        );
    }
    /**
     * Initialize DataLoaders for different query patterns
     * @private
     */
    _initDataLoaders() {
        // Batch function for loading challenges by ID
        const batchLoadChallengesById = async (ids) => {
            this._log('debug', 'Batch loading challenges by IDs', { count: ids.length });
            
            // Execute a single query to get all challenges at once
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .in('id', ids);
                
            if (error) {
                throw new DatabaseError(`Failed to batch load challenges: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'batchLoadChallengesById',
                    metadata: { ids }
                });
            }
            
            // Create a map of id -> challenge
            const challengesMap = (data || []).reduce((map, record) => {
                const challengeData = this._snakeToCamel(record);
                const challenge = challengeMapper.toDomain(challengeData);
                map[record.id] = challenge;
                return map;
            }, {});
            
            // Return challenges in the same order as the input ids
            return ids.map(id => challengesMap[id] || null);
        };
        
        // Batch function for loading challenges by user ID
        const batchLoadChallengesByUserId = async (userIds) => {
            this._log('debug', 'Batch loading challenges by user IDs', { count: userIds.length });
            
            // Execute a single query to get all challenges for all users
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .in('user_id', userIds)
                .order('created_at', { ascending: false });
                
            if (error) {
                throw new DatabaseError(`Failed to batch load challenges by user IDs: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'batchLoadChallengesByUserId',
                    metadata: { userIds }
                });
            }
            
            // Group challenges by user ID
            const challengesByUser = userIds.reduce((result, userId) => {
                result[userId] = [];
                return result;
            }, {});
            
            // Populate the map with challenges
            (data || []).forEach(record => {
                const userId = record.user_id;
                if (challengesByUser[userId]) {
                    const challengeData = this._snakeToCamel(record);
                    const challenge = challengeMapper.toDomain(challengeData);
                    challengesByUser[userId].push(challenge);
                }
            });
            
            // Return challenges in the same order as the input userIds
            return userIds.map(userId => challengesByUser[userId] || []);
        };
        
        // Batch function for loading challenges by user email
        const batchLoadChallengesByUserEmail = async (emails) => {
            this._log('debug', 'Batch loading challenges by user emails', { count: emails.length });
            
            // Execute a single query to get all challenges for all users
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .in('user_email', emails)
                .order('created_at', { ascending: false });
                
            if (error) {
                throw new DatabaseError(`Failed to batch load challenges by user emails: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'batchLoadChallengesByUserEmail',
                    metadata: { emails }
                });
            }
            
            // Group challenges by user email
            const challengesByEmail = emails.reduce((result, email) => {
                result[email] = [];
                return result;
            }, {});
            
            // Populate the map with challenges
            (data || []).forEach(record => {
                const email = record.user_email;
                if (challengesByEmail[email]) {
                    const challengeData = this._snakeToCamel(record);
                    const challenge = challengeMapper.toDomain(challengeData);
                    challengesByEmail[email].push(challenge);
                }
            });
            
            // Return challenges in the same order as the input emails
            return emails.map(email => challengesByEmail[email] || []);
        };
        
        // Create DataLoaders
        this.challengeByIdLoader = dataLoaderRegistry.getLoader(
            'challenge-by-id', 
            batchLoadChallengesById, 
            { maxBatchSize: 100 },
            { ttl: 300 }  // 5 minute cache
        );
        
        this.challengesByUserIdLoader = dataLoaderRegistry.getLoader(
            'challenges-by-user-id', 
            batchLoadChallengesByUserId, 
            { maxBatchSize: 50 },
            { ttl: 300 }  // 5 minute cache
        );
        
        this.challengesByUserEmailLoader = dataLoaderRegistry.getLoader(
            'challenges-by-user-email', 
            batchLoadChallengesByUserEmail, 
            { maxBatchSize: 50 },
            { ttl: 300 }  // 5 minute cache
        );
    }
    
    /**
     * Clear DataLoader caches after mutations
     * @param {string} [challengeId] - Challenge ID to clear
     * @param {string} [userId] - User ID to clear
     * @param {string} [userEmail] - User email to clear
     * @private
     */
    _clearDataLoaderCaches(challengeId, userId, userEmail) {
        if (challengeId) {
            this.challengeByIdLoader.clear(challengeId);
        } else {
            dataLoaderRegistry.clearLoaders('challenge-by-id');
        }
        
        if (userId) {
            this.challengesByUserIdLoader.clear(userId);
        } else {
            dataLoaderRegistry.clearLoaders('challenges-by-user-id');
        }
        
        if (userEmail) {
            this.challengesByUserEmailLoader.clear(userEmail);
        } else {
            dataLoaderRegistry.clearLoaders('challenges-by-user-email');
        }
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
        try {
            // Handle value object if provided
            const id = idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO;
            
            this._validateId(id);
            
            // Use DataLoader to fetch the challenge (handles batching and caching)
            this._log('debug', 'Finding challenge by ID using DataLoader', { id });
            const challenge = await this.challengeByIdLoader.load(id);
            
            if (!challenge && throwIfNotFound) {
                throw new EntityNotFoundError(`Challenge with ID ${id} not found`, {
                    entityId: id,
                    entityType: this.domainName
                });
            }
            
            return challenge;
        } catch (error) {
            // Re-throw EntityNotFoundError as is
            if (error instanceof EntityNotFoundError) {
                throw error;
            }
            
            // Wrap other errors
            throw new DatabaseError(`Failed to fetch challenge: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findById',
                metadata: { 
                    id: idOrIdVO instanceof ChallengeId ? idOrIdVO.value : idOrIdVO
                }
            });
        }
    }
    /**
     * Find multiple challenges by their IDs in a single query
     * @param {Array<string|ChallengeId>} ids - Array of challenge IDs or ChallengeId value objects
     * @returns {Promise<Array<Challenge>>} Array of found challenges (may be fewer than requested if some don't exist)
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findByMultipleIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return [];
        }
        
        // Convert any value objects to string IDs
        const challengeIds = ids.map(id => 
            id instanceof ChallengeId ? id.value : id
        );
        
        // Validate all IDs
        for (const id of challengeIds) {
            this._validateId(id);
        }
        
        this._log('debug', 'Finding multiple challenges by IDs', { count: challengeIds.length });
        
        // Use the DataLoader for efficient batching and caching
        const challenges = await Promise.all(
            challengeIds.map(id => this.challengeByIdLoader.load(id))
        );
        
        // Filter out null values (IDs that weren't found)
        return challenges.filter(Boolean);
    }
    /**
     * Find challenges by user ID
     * 
     * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
     * Only used for read operations and does not modify data across aggregate boundaries.
     * Justified for user dashboards and challenge history views where user context is required.
     * 
     * Uses DataLoader to batch and cache requests to prevent N+1 query issues.
     * 
     * @param {string|UserId} userIdOrVO - User ID or UserId value object
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of results
     * @param {number} options.offset - Offset for pagination
     * @param {string} options.status - Filter by status
     * @param {string} options.sortBy - Field to sort by
     * @param {string} options.sortDir - Sort direction (asc/desc)
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findByUserId(userIdOrVO, options = {}) {
        try {
            // Handle value object if provided
            const userId = userIdOrVO instanceof UserId ? userIdOrVO.value : userIdOrVO;
            
            this._validateRequiredParams({ userId }, ['userId']);
            
            const { limit = 10, offset = 0, status } = options;
            
            // Use DataLoader to efficiently fetch all challenges for this user
            this._log('debug', 'Finding challenges by user ID using DataLoader', { 
                userId, options 
            });
            
            let challenges = await this.challengesByUserIdLoader.load(userId);
            
            // Apply filtering and sorting in memory
            if (status) {
                challenges = challenges.filter(challenge => challenge.status === status);
            }
            
            // Apply pagination in memory
            challenges = challenges.slice(offset, offset + limit);
            
            return challenges;
        } catch (error) {
            throw new DatabaseError(`Failed to fetch challenges by user ID: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByUserId',
                metadata: { 
                    userId: userIdOrVO instanceof UserId ? userIdOrVO.value : userIdOrVO, 
                    options 
                }
            });
        }
    }
    /**
     * Find recent challenges by user ID
     * 
     * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
     * Only used for read operations and provides a simplified interface for the common case
     * of retrieving recent challenges for a user.
     * 
     * @param {string|UserId} userIdOrVO - User ID or UserId value object
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Array<Challenge>>} Array of challenges
     * @throws {ChallengeRepositoryError} If database operation fails
     */
    async findRecentByUserId(userIdOrVO, limit = 5) {
        return this.findByUserId(userIdOrVO, { 
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
        try {
            // Handle value object if provided
            const email = emailOrEmailVO instanceof Email ? emailOrEmailVO.value : emailOrEmailVO;
            
            this._validateRequiredParams({ email }, ['email']);
            
            const { limit = 10, offset = 0, status } = options;
            
            // Use DataLoader to efficiently fetch all challenges for this user email
            this._log('debug', 'Finding challenges by user email using DataLoader', { 
                email, options 
            });
            
            let challenges = await this.challengesByUserEmailLoader.load(email);
            
            // Apply filtering in memory
            if (status) {
                challenges = challenges.filter(challenge => challenge.status === status);
            }
            
            // Apply pagination in memory
            challenges = challenges.slice(offset, offset + limit);
            
            return challenges;
        } catch (error) {
            throw new DatabaseError(`Failed to fetch challenges by user email: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByUserEmail',
                metadata: { 
                    email: emailOrEmailVO instanceof Email ? emailOrEmailVO.value : emailOrEmailVO, 
                    options 
                }
            });
        }
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
            
            // Clear DataLoader caches for affected challenge and user
            this._clearDataLoaderCaches(
                savedChallenge.id, 
                savedChallenge.userId, 
                savedChallenge.userEmail
            );
            
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
            
            // Clear DataLoader caches for deleted challenge and its user
            this._clearDataLoaderCaches(id, challenge.userId, challenge.userEmail);
            
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
            
            // If filtering by user ID, attempt to use the DataLoader for more efficiency
            if (filters.userId && Object.keys(filters).length === 1) {
                const userId = filters.userId;
                this._log('debug', 'Using optimized path for user ID filter', { userId });
                const challenges = await this.findByUserId(userId, options);
                return {
                    results: challenges,
                    total: challenges.length
                };
            }
            
            const { userId, focusArea, difficulty, challengeType, status, searchTerm } = filterResult.data;
            const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc' } = optionsResult.data;
            
            const result = await this._withRetry(async () => {
                this._log('debug', 'Searching challenges', { filters, options });
                
                // Construct the query
                let query = this.db
                    .from(this.tableName)
                    .select('*', { count: 'exact' });
                
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
                        operation: 'search',
                        metadata: { filters, options }
                    });
                }
                
                // Prime the DataLoader cache with the results
                (data || []).forEach(record => {
                    const challengeData = this._snakeToCamel(record);
                    const challenge = challengeMapper.toDomain(challengeData);
                    dataLoaderRegistry.prime('challenge-by-id', record.id, challenge);
                });
                
                return {
                    results: (data || []).map(record => {
                        const challengeData = this._snakeToCamel(record);
                        return challengeMapper.toDomain(challengeData);
                    }),
                    total: count || 0
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
     * @param {string|FocusArea} focusAreaIdOrVO - Focus area ID or FocusArea value object
     * @param {Object} options - Query options
     * @returns {Promise<Array<Challenge>>} Array of challenges
     */
    findByFocusAreaId(focusAreaIdOrVO, options = {}) {
        // Handle value object if provided
        const focusAreaId = focusAreaIdOrVO instanceof FocusArea ? 
            focusAreaIdOrVO.value : focusAreaIdOrVO;
        
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
"