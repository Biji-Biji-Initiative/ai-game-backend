'use strict';

import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import Progress from "#app/core/progress/models/Progress.js";
import { v4 as uuidv4 } from "uuid";
import { createErrorMapper, withRepositoryErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import progressMapper from "#app/core/progress/mappers/ProgressMapper.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { ProgressError, ProgressNotFoundError, ProgressValidationError, ProgressProcessingError } from "#app/core/progress/errors/progressErrors.js";

// Create an error mapper for the progress domain
const progressErrorMapper = createErrorMapper({
    EntityNotFoundError: ProgressNotFoundError,
    ValidationError: ProgressValidationError,
    DatabaseError: ProgressProcessingError
}, ProgressError);

/**
 * Repository for progress data access
 * @extends BaseRepository
 */
class ProgressRepository extends BaseRepository {
    /**
     * Create a new ProgressRepository
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client (Expected to be the initialized Supabase client)
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus for domain events
     * @param {Object} [options.container] - Optional DI container reference
     */
    constructor(options = {}) {
        super({
            db: options.db,
            tableName: 'progress',
            domainName: 'progress',
            logger: options.logger,
            maxRetries: 3,
        });
        this.eventBus = options.eventBus;
        this.validateUuids = true;
        
        // Store container reference if provided, useful for resolving other dependencies
        this.container = options.container;
        
        // Apply standardized error handling to methods
        this.findById = withRepositoryErrorHandling(
            this.findById.bind(this),
            {
                methodName: 'findById',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        this.findByUserId = withRepositoryErrorHandling(
            this.findByUserId.bind(this),
            {
                methodName: 'findByUserId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        this.findByUserAndChallenge = withRepositoryErrorHandling(
            this.findByUserAndChallenge.bind(this),
            {
                methodName: 'findByUserAndChallenge',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this),
            {
                methodName: 'save',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        this.findAllByUserId = withRepositoryErrorHandling(
            this.findAllByUserId.bind(this),
            {
                methodName: 'findAllByUserId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        this.delete = withRepositoryErrorHandling(
            this.delete.bind(this),
            {
                methodName: 'delete',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
        
        // Add findByIds error handling decorator
        this.findByIds = withRepositoryErrorHandling(
            this.findByIds.bind(this),
            {
                methodName: 'findByIds',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: progressErrorMapper
            }
        );
    }
    /**
     * Find a progress record by ID
     * @param {string} id - Progress ID
     * @returns {Promise<Progress|null>} Progress object or null if not found
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findById(id) {
        this._validateId(id);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding progress by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to retrieve progress: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id },
                });
            }
            if (!data) {
                this._log('debug', 'Progress not found', { id });
                return null;
            }
            // Use mapper to convert database record to domain entity, passing options
            return progressMapper.toDomain(data, { EventTypes: EventTypes });
        }, 'findById', { id });
    }

    /**
     * Find multiple progress records by their IDs
     * 
     * Efficiently retrieves multiple progress records in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of progress IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include
     * @returns {Promise<Array<Progress>>} Array of progress objects
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findByIds(ids, options = {}) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            // Map database records to domain objects, passing options
            const progressRecords = progressMapper.toDomainCollection(records, { EventTypes: EventTypes });
            
            // If include options are specified, handle eager loading
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(progressRecords, options.include);
            }
            
            return progressRecords;
        } catch (error) {
            this._log('error', 'Error finding progress records by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new ProgressProcessingError(`Failed to fetch progress records by IDs: ${error.message}`, {
                cause: error,
                metadata: { count: ids?.length || 0 }
            });
        }
    }
    
    /**
     * Load related entities for a collection of progress records
     * Private helper method for implementing eager loading
     * 
     * @param {Array<Progress>} progressRecords - Array of progress objects
     * @param {Array<string>} include - Array of entity types to include
     * @returns {Promise<void>}
     * @private
     */
    async _loadRelatedEntities(progressRecords, include) {
        // No-op if no progress records
        if (!progressRecords || progressRecords.length === 0) {
            return;
        }
        
        // Process each include option
        for (const entityType of include) {
            switch (entityType) {
                case 'challenge':
                    // Extract challenge IDs
                    const challengeIds = progressRecords
                        .map(progress => progress.challengeId)
                        .filter(id => !!id);
                        
                    if (challengeIds.length > 0) {
                        // Get the repository from container or directly
                        const challengeRepo = this.container ? 
                            this.container.get('challengeRepository') : 
                            require('#app/core/challenge/repositories/challengeRepository').default;
                            
                        // Batch load all challenges
                        const challenges = await challengeRepo.findByIds(challengeIds);
                        
                        // Create lookup map
                        const challengeMap = challenges.reduce((map, challenge) => {
                            map[challenge.id] = challenge;
                            return map;
                        }, {});
                        
                        // Attach challenges to progress records
                        progressRecords.forEach(progress => {
                            if (progress.challengeId) {
                                progress.challenge = challengeMap[progress.challengeId] || null;
                            }
                        });
                    }
                    break;
                    
                case 'user':
                    // Extract user IDs
                    const userIds = progressRecords
                        .map(progress => progress.userId)
                        .filter(id => !!id);
                        
                    if (userIds.length > 0) {
                        // Get the repository from container or directly
                        const userRepo = this.container ? 
                            this.container.get('userRepository') : 
                            require('#app/core/user/repositories/UserRepository').default;
                            
                        // Batch load all users
                        const users = await userRepo.findByIds(userIds);
                        
                        // Create lookup map
                        const userMap = users.reduce((map, user) => {
                            map[user.id] = user;
                            return map;
                        }, {});
                        
                        // Attach users to progress records
                        progressRecords.forEach(progress => {
                            if (progress.userId) {
                                progress.user = userMap[progress.userId] || null;
                            }
                        });
                    }
                    break;
            }
        }
    }
    /**
     * Find a user's progress
     * @param {string} userId - User ID
     * @param {Object} [options={}] - Query options
     * @param {Array<string>} [options.include] - Related entities to include (e.g., ['challenge', 'user'])
     * @returns {Promise<Progress|null>} Progress object or null if not found
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findByUserId(userId, options = {}) {
        this._validateRequiredParams({ userId }, ['userId']);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding progress by user ID', { userId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch progress by user ID: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserId',
                    metadata: { userId },
                });
            }
            if (!data) {
                this._log('debug', 'Progress not found for user', { userId });
                return null;
            }
            
            // Use mapper to convert database record to domain entity, passing options
            const progress = progressMapper.toDomain(data, { EventTypes: EventTypes });
            
            // Handle eager loading if specified in options
            if (options.include && Array.isArray(options.include) && options.include.length > 0
                && progress) {
                await this._loadRelatedEntities([progress], options.include);
            }
            
            return progress;
        }, 'findByUserId', { userId });
    }
    /**
     * Find a user's progress for a specific challenge
     * @param {string} userId - User ID
     * @param {string} challengeId - Challenge ID
     * @returns {Promise<Progress|null>} Progress object or null if not found
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findByUserAndChallenge(userId, challengeId) {
        this._validateRequiredParams({ userId, challengeId }, ['userId', 'challengeId']);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding progress for challenge', { userId, challengeId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('challenge_id', challengeId)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch progress for challenge: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserAndChallenge',
                    metadata: { userId, challengeId },
                });
            }
            if (!data) {
                this._log('debug', 'Progress not found for challenge', { userId, challengeId });
                return null;
            }
            // Use mapper to convert database record to domain entity, passing options
            const progress = progressMapper.toDomain(data, { EventTypes: EventTypes });
            
            return progress;
        }, 'findByUserAndChallenge', { userId, challengeId });
    }
    /**
     * Save a progress record
     * @param {Progress} progress - Progress object to save
     * @returns {Promise<Progress>} Saved Progress object
     * @throws {ProgressValidationError} If progress validation fails
     * @throws {ProgressProcessingError} If database operation fails
     */
    async save(progress) {
        if (!progress) {
            throw new ValidationError('Progress object is required', {
                entityType: this.domainName,
            });
        }
        if (!(progress instanceof Progress)) {
            throw new ValidationError('Object must be a Progress instance', {
                entityType: this.domainName,
            });
        }
        
        // Validate progress before saving
        const validation = progress.validate();
        if (!validation.isValid) {
            throw new ValidationError(`Invalid progress data: ${validation.errors.join(', ')}`, {
                entityType: this.domainName,
                validationErrors: validation.errors,
            });
        }
        
        // Ensure entity has EventTypes
        if (!progress.EventTypes) {
             progress.EventTypes = EventTypes;
        }
        
        // Collect domain events for publishing after successful save
        const domainEventsToPublish = progress.getDomainEvents ? progress.getDomainEvents() : [];
        
        // Clear the events from the entity to prevent double-publishing
        if (domainEventsToPublish.length > 0 && progress.clearDomainEvents) {
            progress.clearDomainEvents();
        }
        
        // Use withTransaction to ensure events are only published after successful commit
        return this.withTransaction(async (transaction) => {
            // Set created_at and updated_at if not already set
            const now = new Date().toISOString();
            if (!progress.createdAt) {
                progress.createdAt = now;
            }
            progress.updatedAt = now;
            
            // Generate ID if not present (for new records)
            if (!progress.id) {
                progress.id = uuidv4();
            }
            
            // Convert to database format using mapper
            const progressData = progressMapper.toPersistence(progress);
            
            this._log('debug', 'Saving progress record', {
                id: progress.id,
                userId: progress.userId,
                isNew: !progress.createdAt, // Assuming createdAt reflects creation status
            });
            
            // Upsert progress data using the transaction
            const { data, error } = await transaction
                .from(this.tableName)
                .upsert(progressData)
                .select()
                .single();
                
            if (error) {
                throw new DatabaseError(`Failed to save progress: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'save',
                    metadata: { id: progress.id, userId: progress.userId },
                });
            }
            
            this._log('debug', 'Progress record saved successfully', { id: data.id });
            
            // Convert database record to domain entity using mapper, passing options
            const savedProgress = progressMapper.toDomain(data, { EventTypes: EventTypes });
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedProgress,
                domainEvents: domainEventsToPublish
            };
        }, {publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use repository's invalidator
        });
    }
    /**
     * Find all progress records for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array<Progress>>} Array of progress records
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findAllByUserId(userId) {
        this._validateRequiredParams({ userId }, ['userId']);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding all progress for user', { userId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId);
            if (error) {
                throw new DatabaseError(`Failed to fetch progress records: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findAllByUserId',
                    metadata: { userId },
                });
            }
            // Use mapper, passing options
            return progressMapper.toDomainCollection(data || [], { EventTypes: EventTypes });
        }, 'findAllByUserId', { userId });
    }

    /**
     * Find progress records for multiple users
     * Efficiently retrieves progress records for multiple users in a single query
     * to prevent N+1 query performance issues.
     * 
     * @param {Array<string>} userIds - Array of user IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include
     * @returns {Promise<Array<Progress>>} Array of progress records
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findByUserIds(userIds, options = {}) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return [];
        }
        
        // Remove duplicates for efficiency
        const uniqueUserIds = [...new Set(userIds)];
        
        return this._withRetry(async () => {
            this._log('debug', 'Finding progress records for multiple users', { 
                count: uniqueUserIds.length 
            });
            
            // Query all progress records for the specified users
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .in('user_id', uniqueUserIds);
                
            if (error) {
                throw new DatabaseError(`Failed to fetch progress records for users: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserIds',
                    metadata: { count: uniqueUserIds.length }
                });
            }
            
            // Map database records to domain objects, passing options
            const progressRecords = progressMapper.toDomainCollection(data || [], { EventTypes: EventTypes });
            
            // If include options are specified, handle eager loading
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(progressRecords, options.include);
            }
            
            return progressRecords;
        }, 'findByUserIds', { count: uniqueUserIds.length });
    }

    /**
     * Delete a progress record
     * @param {string} id - Progress ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     * @throws {ProgressProcessingError} If database operation fails
     */
    async delete(id) {
        this._validateId(id);
        
        // Use withTransaction to ensure events are only published after successful commit
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting progress record', { id });
            
            // Check if record exists before deleting
            const { data: existing, error: fetchError } = await transaction
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
                
            if (fetchError) {
                throw new DatabaseError(`Failed to fetch progress for deletion: ${fetchError.message}`, {
                    cause: fetchError,
                    entityType: this.domainName,
                    operation: 'delete.fetch',
                    metadata: { id },
                });
            }
            
            if (!existing) {
                throw new EntityNotFoundError(`Progress with ID ${id} not found`, {
                    entityId: id,
                    entityType: this.domainName,
                });
            }
            
            // Convert to domain entity to create events, passing options
            const existingProgress = progressMapper.toDomain(existing, { EventTypes: EventTypes });
            
            // Collect domain events for publishing after successful deletion
            const domainEventsToPublish = [];
            if (existingProgress?.addDomainEvent) { // Check if method exists
                 existingProgress.addDomainEvent(EventTypes.PROGRESS_DELETED, {
                    progressId: id,
                    userId: existingProgress.userId,
                    timestamp: new Date().toISOString(),
                });
                domainEventsToPublish.push(...existingProgress.getDomainEvents());
                existingProgress.clearDomainEvents(); // Clear events after collecting
            }
            
            // Delete the record using transaction
            const { error: deleteError } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', id);
                
            if (deleteError) {
                throw new DatabaseError(`Failed to delete progress: ${deleteError.message}`, {
                    cause: deleteError,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id },
                });
            }
            
            this._log('debug', 'Progress record deleted successfully', { id });
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: true,
                domainEvents: domainEventsToPublish
            };
        }, {publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use repository's invalidator
        });
    }
}

export { ProgressRepository };
export default ProgressRepository;
