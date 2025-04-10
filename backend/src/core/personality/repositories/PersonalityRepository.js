'use strict';

import Personality from "#app/core/personality/models/Personality.js";
import personalityMapper from "#app/core/personality/mappers/PersonalityMapper.js";
import { v4 as uuidv4 } from "uuid";
import { personalityDatabaseSchema } from "#app/core/personality/schemas/personalitySchema.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityRepositoryError } from "#app/core/personality/errors/PersonalityErrors.js";
import { createErrorMapper, createErrorCollector, withRepositoryErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";

// Create an error mapper for the personality domain
const personalityErrorMapper = createErrorMapper({
    EntityNotFoundError: PersonalityNotFoundError,
    ValidationError: PersonalityValidationError,
    DatabaseError: PersonalityRepositoryError
}, PersonalityError);
/**
 * Repository for personality data access
 * @extends BaseRepository
 */
class PersonalityRepository extends BaseRepository {
    /**
     * Create a new PersonalityRepository
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus for domain events
     */
    constructor(options = {}) {
        console.log('[PersonalityRepository] Constructor START', { 
             hasDb: !!options.db, 
             hasLogger: !!options.logger, 
             hasEventBus: !!options.eventBus 
        });
        // Ensure logger exists early for subsequent logging
        const internalLogger = options.logger || logger.child({ component: 'PersonalityRepository' }); // Use default if needed
        internalLogger.info('PersonalityRepository initializing...');

        if (!options.db) internalLogger.error('Missing required dependency: db');
        if (!options.eventBus) internalLogger.error('Missing required dependency: eventBus');

        super({
            db: options.db,
            tableName: 'personality_profiles',
            domainName: 'personality',
            logger: internalLogger, // Use the ensured logger
            maxRetries: 3
        });
        this.eventBus = options.eventBus;
        this.validateUuids = true;
        
        // Apply standardized error handling to all repository methods
        // Wrap methods AFTER super() call and setting this.logger
        try {
             this.findById = withRepositoryErrorHandling(
                this.findById.bind(this),
                {
                    methodName: 'findById',
                    domainName: this.domainName,
                    logger: this.logger,
                    errorMapper: personalityErrorMapper
                }
            );
            
            this.findByUserId = withRepositoryErrorHandling(
                this.findByUserId.bind(this),
                {
                    methodName: 'findByUserId',
                    domainName: this.domainName,
                    logger: this.logger,
                    errorMapper: personalityErrorMapper
                }
            );
            
            this.save = withRepositoryErrorHandling(
                this.save.bind(this),
                {
                    methodName: 'save',
                    domainName: this.domainName,
                    logger: this.logger,
                    errorMapper: personalityErrorMapper
                }
            );
            
            this.delete = withRepositoryErrorHandling(
                this.delete.bind(this),
                {
                    methodName: 'delete',
                    domainName: this.domainName,
                    logger: this.logger,
                    errorMapper: personalityErrorMapper
                }
            );
            
            this.deleteByUserId = withRepositoryErrorHandling(
                this.deleteByUserId.bind(this),
                {
                    methodName: 'deleteByUserId',
                    domainName: this.domainName,
                    logger: this.logger,
                    errorMapper: personalityErrorMapper
                }
            );
            internalLogger.info('PersonalityRepository methods wrapped with error handling.');
        } catch(wrappingError) {
            internalLogger.error('Error applying repository error handling wrappers', { error: wrappingError });
            // Decide if this is fatal - perhaps rethrow?
            // throw wrappingError;
        }
        console.log('[PersonalityRepository] Constructor END');
    }
    /**
     * Find a personality profile by ID
     * @param {string} id - Personality profile ID
     * @param {boolean} throwIfNotFound - Whether to throw if not found
     * @returns {Promise<Personality|null>} Personality object or null if not found
     * @throws {PersonalityNotFoundError} If personality not found and throwIfNotFound is true
     * @throws {PersonalityValidationError} If validation fails
     * @throws {PersonalityError} If database operation fails
     */
    async findById(id, throwIfNotFound = false) {
        this._validateId(id);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding personality by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to retrieve personality: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id }
                });
            }
            if (!data) {
                this._log('debug', 'Personality not found', { id });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`Personality with ID ${id} not found`, {
                        entityId: id,
                        entityType: this.domainName
                    });
                }
                return null;
            }
            // Validate the database data before converting to domain object
            const validationResult = personalityDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    id,
                    errors: validationResult.error.message
                });
                // Decide how to handle invalid data from DB (e.g., return null, throw?)
                // Returning null might be safer if data integrity is suspect.
                return null; 
            }
            // Convert database data to domain object using mapper, passing options
            return personalityMapper.toDomain(data, { EventTypes: EventTypes });
        }, 'findById', { id });
    }
    /**
     * Find a personality profile by user ID
     * @param {string} userId - User ID
     * @param {boolean} throwIfNotFound - Whether to throw if not found (new parameter)
     * @returns {Promise<Personality|null>} Personality object or null if not found
     * @throws {PersonalityValidationError} If validation fails
     * @throws {PersonalityError} If database operation fails
     */
    async findByUserId(userId, throwIfNotFound = false) { // Added throwIfNotFound
        this._validateRequiredParams({ userId }, ['userId']);
        return await this._withRetry(async () => {
            this._log('debug', 'Finding personality by user ID', { userId });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch personality by user ID: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserId',
                    metadata: { userId }
                });
            }
            if (!data) {
                this._log('debug', 'Personality not found for user', { userId });
                if (throwIfNotFound) { // Check throwIfNotFound
                     throw new EntityNotFoundError(`Personality for User ID ${userId} not found`, {
                        entityId: userId, // Use userId as identifier
                        entityType: this.domainName,
                        identifierType: 'userId'
                    });
                }
                return null;
            }
            // Validate the database data before converting to domain object
            const validationResult = personalityDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    userId,
                    errors: validationResult.error.message
                });
                 // Decide how to handle invalid data from DB (e.g., return null, throw?)
                return null; 
            }
            // Convert database data to domain object using mapper, passing options
            return personalityMapper.toDomain(data, { EventTypes: EventTypes });
        }, 'findByUserId', { userId });
    }
    /**
     * Save a personality profile to the database (create or update)
     * @param {Personality} personality - Personality object to save
     * @returns {Promise<Personality>} Updated personality object
     * @throws {PersonalityValidationError} If validation fails
     * @throws {PersonalityRepositoryError} If database operation fails
     */
    async save(personality) {
        if (!personality) {
            throw new ValidationError('Personality object is required', {
                entityType: this.domainName
            });
        }
        if (!(personality instanceof Personality)) {
            throw new ValidationError('Object must be a Personality instance', {
                entityType: this.domainName
            });
        }
        // Validate personality before saving using domain model's method
        const validation = personality.validate();
        if (!validation.isValid) {
            throw new ValidationError(`Invalid personality data: ${validation.errors.join(', ')}`, {
                entityType: this.domainName,
                validationErrors: validation.errors
            });
        }
        
        // Ensure entity has EventTypes
        if (!personality.EventTypes) {
             personality.EventTypes = EventTypes;
        }
        
        const domainEventsToPublish = personality.getDomainEvents();
        
        // Clear the events from the entity to prevent double-publishing
        if (personality.clearDomainEvents) {
            personality.clearDomainEvents();
        }
        
        // Use withTransaction to ensure events are only published after successful commit
        return this.withTransaction(async (transaction) => {
            // Set created_at and updated_at if not already set
            const now = new Date().toISOString();
            if (!personality.createdAt) {
                personality.createdAt = now;
            }
            personality.updatedAt = now;
            
            // Generate ID if not present (for new profiles)
            if (!personality.id) {
                personality.id = uuidv4();
            }
            
            // Convert to database format using mapper
            const personalityData = personalityMapper.toPersistence(personality);
            
            // Validate database format (mapper should already have done this if configured)
            // const dbValidationResult = personalityDatabaseSchema.safeParse(personalityData);
            // if (!dbValidationResult.success) { ... }
            
            this._log('debug', 'Saving personality profile', {
                id: personality.id,
                userId: personality.userId,
                isNew: !personality.createdAt // Might need a better way to determine if new
            });
            
            // Upsert personality data
            const { data, error } = await transaction
                .from(this.tableName)
                .upsert(personalityData) // Use data directly from mapper
                .select()
                .single();
                
            if (error) {
                throw new DatabaseError(`Failed to save personality profile: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'save',
                    metadata: { id: personality.id, userId: personality.userId }
                });
            }
            
            this._log('info', 'Personality profile saved successfully', { id: data.id });
            
            // Convert result back to domain object using mapper, passing options
            const savedPersonality = personalityMapper.toDomain(data, { EventTypes: EventTypes });
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedPersonality,
                domainEvents: domainEventsToPublish
            };
        }, {publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use repository's invalidator
        });
    }
    /**
     * Delete a personality profile by ID
     * @param {string} id - Personality profile ID
     * @returns {Promise<boolean>} True if successfully deleted
     * @throws {PersonalityNotFoundError} If personality not found
     * @throws {PersonalityRepositoryError} If database operation fails
     */
    async delete(id) {
        this._validateId(id);
        
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting personality profile by ID', { id });
            
            // First check if profile exists and get data for event
            const { data: existingRecord, error: fetchError } = await transaction
                .from(this.tableName)
                .select('*') 
                .eq('id', id)
                .maybeSingle();
            
            if (fetchError) {
                 throw new DatabaseError(`Failed to fetch personality for deletion: ${fetchError.message}`, {
                     cause: fetchError,
                     entityType: this.domainName,
                     operation: 'delete.fetch',
                     metadata: { id }
                 });
            }
            
            if (!existingRecord) {
                throw new EntityNotFoundError(`Personality with ID ${id} not found`, {
                    entityId: id,
                    entityType: this.domainName
                });
            }

            // Convert to domain entity to create event, passing options
            const existingPersonality = personalityMapper.toDomain(existingRecord, { EventTypes: EventTypes });
            
            // Create a domain event for the deletion
            const domainEvents = [];
            if (existingPersonality?.addDomainEvent) { // Check if method exists
                existingPersonality.addDomainEvent(EventTypes.PERSONALITY_PROFILE_DELETED, {
                        personalityId: id,
                        userId: existingPersonality.userId,
                        timestamp: new Date().toISOString()
                    });
                domainEvents.push(...existingPersonality.getDomainEvents());
            }
            
            // Do the delete
            const { error } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', id);
                
            if (error) {
                throw new DatabaseError(`Failed to delete personality profile: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            this._log('info', 'Personality profile deleted successfully', { id });
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use repository's invalidator
        });
    }
    /**
     * Delete a personality profile by user ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} True if successfully deleted
     * @throws {PersonalityValidationError} If validation fails
     * @throws {PersonalityRepositoryError} If database operation fails
     */
    async deleteByUserId(userId) {
        this._validateRequiredParams({ userId }, ['userId']);
        
        return this.withTransaction(async (transaction) => {
            this._log('debug', 'Deleting personality profile by user ID', { userId });
            
            // First check if profile exists for this user and get data for event
             const { data: existingRecord, error: fetchError } = await transaction
                .from(this.tableName)
                .select('*') 
                .eq('user_id', userId)
                .maybeSingle();
            
            if (fetchError) {
                 throw new DatabaseError(`Failed to fetch personality for deletion by user ID: ${fetchError.message}`, {
                     cause: fetchError,
                     entityType: this.domainName,
                     operation: 'deleteByUserId.fetch',
                     metadata: { userId }
                 });
            }
            
            if (!existingRecord) {
                this._log('debug', 'No personality profile found for user to delete', { userId });
                return { result: true, domainEvents: [] }; // Nothing to delete, technically successful
            }
            
             // Convert to domain entity to create event, passing options
            const existingPersonality = personalityMapper.toDomain(existingRecord, { EventTypes: EventTypes });

            // Create a domain event for the deletion
            const domainEvents = [];
             if (existingPersonality?.addDomainEvent) { // Check if method exists
                existingPersonality.addDomainEvent(EventTypes.PERSONALITY_PROFILE_DELETED, {
                    personalityId: existingPersonality.id,
                    userId,
                    timestamp: new Date().toISOString()
                });
                domainEvents.push(...existingPersonality.getDomainEvents());
                existingPersonality.clearDomainEvents(); // Clear events after collecting
            }
            
            // Do the delete
            const { error } = await transaction
                .from(this.tableName)
                .delete()
                .eq('user_id', userId);
                
            if (error) {
                throw new DatabaseError(`Failed to delete personality profile for user: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'deleteByUserId',
                    metadata: { userId }
                });
            }
            
            this._log('info', 'Personality profile deleted successfully for user', {
                userId,
                profileId: existingPersonality.id
            });
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: true,
                domainEvents: domainEvents
            };
        }, {publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true, // Enable cache invalidation
            cacheInvalidator: this.cacheInvalidator // Use repository's invalidator
        });
    }
}

export { PersonalityRepository };
export default PersonalityRepository;
