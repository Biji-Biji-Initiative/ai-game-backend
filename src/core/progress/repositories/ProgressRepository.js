import Progress from "../models/Progress.js";
import { supabaseClient } from "../../infra/db/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";
import domainEvents from "../../common/events/domainEvents.js";
import { BaseRepository } from "../../infra/repositories/BaseRepository.js";
import { ProgressError, ProgressNotFoundError, ProgressValidationError, ProgressProcessingError } from "../errors/ProgressErrors.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "../../infra/errors/errorStandardization.js";
import progressMapper from "../mappers/ProgressMapper.js";
'use strict';
const { eventBus } = domainEvents;
const { EntityNotFoundError, ValidationError, DatabaseError, } = BaseRepository;
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
     * @param {Object} options.db - Database client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus for domain events
     */
    constructor(options = {}) {
        super({
            db: options.db || supabaseClient,
            tableName: 'user_progress',
            domainName: 'progress',
            logger: options.logger,
            maxRetries: 3,
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
            // Use mapper to convert database record to domain entity
            return progressMapper.toDomain(data);
        }, 'findById', { id });
    }
    /**
     * Find a user's progress
     * @param {string} userId - User ID
     * @returns {Promise<Progress|null>} Progress object or null if not found
     * @throws {ProgressProcessingError} If database operation fails
     */
    async findByUserId(userId) {
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
            // Use mapper to convert database record to domain entity
            return progressMapper.toDomain(data);
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
            // Use mapper to convert database record to domain entity
            return progressMapper.toDomain(data);
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
        
        // Collect domain events for publishing after successful save
        const domainEvents = progress.getDomainEvents ? progress.getDomainEvents() : [];
        
        // Clear the events from the entity to prevent double-publishing
        if (domainEvents.length > 0 && progress.clearDomainEvents) {
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
                isNew: !progress.createdAt,
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
            
            // Convert database record to domain entity using mapper
            const savedProgress = progressMapper.toDomain(data);
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedProgress,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
    }
    /**
     * Find all progress records for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array<Progress>>} Array of Progress objects
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
                throw new DatabaseError(`Failed to fetch all progress for user: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findAllByUserId',
                    metadata: { userId },
                });
            }
            this._log('debug', `Found ${data?.length || 0} progress records for user`, { userId });
            // Convert database records to domain entities using mapper
            return progressMapper.toDomainCollection(data || []);
        }, 'findAllByUserId', { userId });
    }
    /**
     * Delete a progress record
     * @param {string} id - Progress ID
     * @returns {Promise<boolean>} True if successful
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
            
            // Convert to domain entity to create events
            const existingProgress = progressMapper.toDomain(existing);
            
            // Create a domain event for deletion
            if (existingProgress.addDomainEvent) {
                existingProgress.addDomainEvent('ProgressDeleted', {
                    progressId: id,
                    userId: existingProgress.userId,
                    timestamp: new Date().toISOString(),
                });
            }
            
            // Collect domain events for publishing after successful deletion
            const domainEvents = existingProgress.getDomainEvents ? existingProgress.getDomainEvents() : [];
            
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
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
    }
}
export default ProgressRepository;
