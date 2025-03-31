'use strict';

import FocusArea from "../../focusArea/models/FocusArea.js";
import { FocusAreaNotFoundError, FocusAreaPersistenceError, FocusAreaValidationError, FocusAreaError } from "../../focusArea/errors/focusAreaErrors.js";
import domainEvents from "../../common/events/domainEvents.js";
import { supabaseClient } from "../../infra/db/supabaseClient.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "../../infra/repositories/BaseRepository.js";
// Importing but not using directly - needed for schema definitions
// import { focusAreaSchema } from "../schemas/focusAreaValidation.js";
import { withRepositoryErrorHandling, createErrorMapper, createErrorCollector } from "../../infra/errors/errorStandardization.js";
import { v4 as uuidv4 } from "uuid";

const { eventBus, EventTypes } = domainEvents;

// Create an error mapper for the focus area domain
const focusAreaErrorMapper = createErrorMapper({
    EntityNotFoundError: FocusAreaNotFoundError,
    ValidationError: FocusAreaValidationError,
    DatabaseError: FocusAreaPersistenceError
}, FocusAreaError);

/**
 * Repository for focus area data access
 * @extends BaseRepository
 */
class FocusAreaRepository extends BaseRepository {
    /**
     * Create a new FocusAreaRepository
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus for domain events
     */
    constructor(options = {}) {
        super({
            db: options.db || supabaseClient,
            tableName: 'focus_areas',
            domainName: 'focusArea',
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
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.findByUserId = withRepositoryErrorHandling(
            this.findByUserId.bind(this),
            {
                methodName: 'findByUserId',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.findAll = withRepositoryErrorHandling(
            this.findAll.bind(this),
            {
                methodName: 'findAll',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this),
            {
                methodName: 'save',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.createFocusArea = withRepositoryErrorHandling(
            this.createFocusArea.bind(this),
            {
                methodName: 'createFocusArea',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.saveBatch = withRepositoryErrorHandling(
            this.saveBatch.bind(this),
            {
                methodName: 'saveBatch',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
        
        this.deleteById = withRepositoryErrorHandling(
            this.deleteById.bind(this),
            {
                methodName: 'deleteById',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaErrorMapper
            }
        );
    }

    /**
     * Find a focus area by its ID
     * @param {string} id - Focus area ID
     * @param {boolean} throwIfNotFound - Whether to throw an error if not found
     * @returns {Promise<FocusArea|null>} Focus area object or null if not found
     * @throws {FocusAreaNotFoundError} If focus area not found and throwIfNotFound is true
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async findById(id, throwIfNotFound = false) {
        // Validate ID
        this._validateId(id);
        
        return this._withRetry(async () => {
            this._log('debug', 'Finding focus area by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) {
                throw new DatabaseError(`Failed to fetch focus area: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id }
                });
            }
            
            if (!data) {
                this._log('debug', 'Focus area not found', { id });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`Focus area with ID ${id} not found`, {
                        entityId: id,
                        entityType: this.domainName
                    });
                }
                return null;
            }
            
            return FocusArea.fromDatabase(data);
        }, 'findById', { id });
    }

    /**
     * Find multiple focus areas by their IDs
     * 
     * Efficiently retrieves multiple focus areas in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of focus area IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async findByIds(ids, options = {}) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            // Map database records to domain objects
            const focusAreas = records.map(record => FocusArea.fromDatabase(record));
            
            // If include options are specified, handle eager loading
            if (options.include && Array.isArray(options.include) && options.include.length > 0) {
                await this._loadRelatedEntities(focusAreas, options.include);
            }
            
            return focusAreas;
        } catch (error) {
            this._log('error', 'Error finding focus areas by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(`Failed to fetch focus areas by IDs: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByIds'
            });
        }
    }
    
    /**
     * Load related entities for a collection of focus areas
     * Private helper method for implementing eager loading
     * 
     * @param {Array<FocusArea>} focusAreas - Array of focus area objects
     * @param {Array<string>} include - Array of entity types to include
     * @returns {Promise<void>}
     * @private
     */
    async _loadRelatedEntities(focusAreas, include) {
        // No-op if no focus areas
        if (!focusAreas || focusAreas.length === 0) {
            return;
        }
        
        // Process each include option
        for (const entityType of include) {
            switch (entityType) {
                case 'challenges':
                    // Extract user IDs to get challenges by user
                    const userIds = [...new Set(focusAreas.map(fa => fa.userId).filter(id => !!id))];
                    
                    if (userIds.length > 0) {
                        // Get the repository from container or directly
                        const challengeRepo = this.container ? 
                            this.container.get('challengeRepository') : 
                            require('../../challenge/repositories/challengeRepository').default;
                        
                        // Get all challenges for these focus areas (will need to be filtered)
                        const allChallenges = [];
                        for (const userId of userIds) {
                            const userChallenges = await challengeRepo.findByUserId(userId);
                            allChallenges.push(...userChallenges);
                        }
                        
                        // Group challenges by focus area
                        const challengesByFocusArea = {};
                        for (const challenge of allChallenges) {
                            if (challenge.focusAreaId) {
                                if (!challengesByFocusArea[challenge.focusAreaId]) {
                                    challengesByFocusArea[challenge.focusAreaId] = [];
                                }
                                challengesByFocusArea[challenge.focusAreaId].push(challenge);
                            }
                        }
                        
                        // Attach challenges to each focus area
                        focusAreas.forEach(focusArea => {
                            if (focusArea.id && challengesByFocusArea[focusArea.id]) {
                                focusArea.challenges = challengesByFocusArea[focusArea.id];
                            } else {
                                focusArea.challenges = [];
                            }
                        });
                    }
                    break;
                    
                // Add other entity types as needed
            }
        }
    }

    /**
     * Find focus areas by user ID
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of results
     * @param {number} options.offset - Offset for pagination
     * @param {boolean} options.activeOnly - Filter by active status
     * @param {string} options.sortBy - Field to sort by
     * @param {string} options.sortDir - Sort direction (asc/desc)
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async findByUserId(userId, options = {}) {
        // Validate required parameters
        this._validateRequiredParams({ userId }, ['userId']);
        
        const { limit = 100, offset = 0, activeOnly = false, sortBy = 'priority', sortDir = 'asc' } = options;
        
        return this._withRetry(async () => {
            this._log('debug', 'Finding focus areas by user ID', { userId, options });
            
            const query = this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId)
                .order(this._camelToSnakeField(sortBy), { ascending: sortDir === 'asc' })
                .range(offset, offset + limit - 1);
                
            if (activeOnly) {
                query.eq('active', true);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new DatabaseError(`Failed to fetch focus areas by user ID: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserId',
                    metadata: { userId, options }
                });
            }
            
            // Map database records to domain objects
            return (data || []).map(record => FocusArea.fromDatabase(record));
        }, 'findByUserId', { userId, options });
    }

    /**
     * Find all focus areas
     * @param {Object} options - Query options
     * @returns {Promise<Array<FocusArea>>} List of focus areas
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async findAll(options = {}) {
        const { limit = 100, offset = 0, sortBy = 'name', sortDir = 'asc' } = options;
        
        return this._withRetry(async () => {
            this._log('debug', 'Finding all focus areas', { options });
            
            const query = this.db
                .from(this.tableName)
                .select('*')
                .order(this._camelToSnakeField(sortBy), { ascending: sortDir === 'asc' })
                .range(offset, offset + limit - 1);
                
            const { data, error } = await query;
            
            if (error) {
                throw new DatabaseError(`Failed to fetch all focus areas: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findAll',
                    metadata: { options }
                });
            }
            
            // Map database records to domain objects
            return (data || []).map(record => FocusArea.fromDatabase(record));
        }, 'findAll', { options });
    }

    /**
     * Create a new focus area
     * @param {Object} focusAreaData - Focus area data
     * @returns {Promise<FocusArea>} Created focus area
     * @throws {FocusAreaValidationError} If focus area data is invalid
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async createFocusArea(focusAreaData) {
        // Validate required parameters
        this._validateRequiredParams(focusAreaData, ['userId', 'name']);
        
        // Create a focus area domain object (this will validate the data)
        const focusArea = new FocusArea({
            userId: focusAreaData.userId,
            name: focusAreaData.name,
            description: focusAreaData.description || '',
            priority: focusAreaData.priority || 1,
            metadata: focusAreaData.metadata || {}
        });
        
        // Save to database
        return this.save(focusArea);
    }

    /**
     * Save a focus area
     * @param {FocusArea} focusArea - Focus area to save
     * @returns {Promise<FocusArea>} Saved focus area
     * @throws {FocusAreaValidationError} If focus area data is invalid
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async save(focusArea) {
        // Validate focus area object
        if (!focusArea) {
            throw new ValidationError('Focus area object is required', {
                entityType: this.domainName
            });
        }
        
        if (!(focusArea instanceof FocusArea)) {
            throw new ValidationError('Object must be a FocusArea instance', {
                entityType: this.domainName
            });
        }
        
        // Convert focus area to database format
        const focusAreaData = {
            id: focusArea.id,
            user_id: focusArea.userId,
            name: focusArea.name,
            description: focusArea.description || '',
            priority: focusArea.priority || 1,
            metadata: focusArea.metadata || {},
            created_at: focusArea.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        return this._withRetry(async () => {
            // Check if this is a new focus area or an update
            const existingFocusArea = await this.findById(focusArea.id).catch(() => null);
            const isUpdate = existingFocusArea !== null;
            let result;
            
            if (isUpdate) {
                // Update existing focus area
                this._log('debug', 'Updating existing focus area', { id: focusArea.id });
                const { data, error } = await this.db
                    .from(this.tableName)
                    .update(focusAreaData)
                    .eq('id', focusArea.id)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to update focus area: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'update',
                        metadata: { focusAreaId: focusArea.id }
                    });
                }
                result = data;
            }
            else {
                // Insert new focus area
                this._log('debug', 'Creating new focus area', { id: focusArea.id });
                const { data, error } = await this.db
                    .from(this.tableName)
                    .insert(focusAreaData)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to create focus area: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'create',
                        metadata: { focusAreaId: focusArea.id }
                    });
                }
                result = data;
            }
            
            this._log('debug', 'Saved focus area', {
                id: focusArea.id,
                name: focusArea.name
            });
            
            // Create domain object from database result
            const savedFocusArea = FocusArea.fromDatabase(result);
            
            // Publish an event
            try {
                const eventType = isUpdate ? EventTypes.FOCUS_AREA_UPDATED : EventTypes.FOCUS_AREA_CREATED;
                const event = {
                    type: eventType,
                    payload: {
                        focusAreaId: savedFocusArea.id,
                        userId: savedFocusArea.userId,
                        name: savedFocusArea.name
                    }
                };
                
                await this.eventBus.publish(event.type, event.payload);
                this._log('debug', `Published ${eventType} event`, { id: savedFocusArea.id });
            }
            catch (eventError) {
                // Log but don't fail the operation
                this._log('error', 'Error publishing focus area event', {
                    id: savedFocusArea.id,
                    error: eventError.message
                });
            }
            
            return savedFocusArea;
        }, 'save', { focusAreaId: focusArea.id });
    }

    /**
     * Save a batch of focus areas for a user
     * @param {string} userId - User ID
     * @param {Array<Object>} focusAreas - Focus area data objects
     * @returns {Promise<Array<FocusArea>>} Saved focus areas
     * @throws {FocusAreaValidationError} If focus area data is invalid
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    // eslint-disable-next-line no-unused-vars
    async saveBatch(userId, focusAreas, _unused = null) {
        // Validate parameters
        this._validateRequiredParams({ userId }, ['userId']);
        
        if (!Array.isArray(focusAreas)) {
            throw new ValidationError('focusAreas must be an array', {
                entityType: this.domainName
            });
        }
        
        if (focusAreas.length === 0) {
            this._log('debug', 'No focus areas to save, returning empty array');
            return [];
        }
        
        this._log('debug', 'Saving batch of focus areas', {
            userId,
            count: focusAreas.length
        });
        
        // Create focus area domain objects
        const focusAreaEntities = focusAreas.map(data => {
            return new FocusArea({
                id: data.id || uuidv4(),
                userId: userId,
                name: data.name,
                description: data.description || '',
                priority: data.priority || 1,
                metadata: data.metadata || {},
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        });
        
        // eslint-disable-next-line no-unused-vars
        return this.withTransaction(async (_unused) => {
            // Save each focus area individually, tracking domain events
            const savedAreas = [];
            const allDomainEvents = [];
            const errorCollector = createErrorCollector();
            
            for (const focusArea of focusAreaEntities) {
                try {
                    // Use the save method but wrap in error collector
                    const savedArea = await this.save(focusArea);
                    savedAreas.push(savedArea);
                    
                    // Collect domain events if available
                    if (focusArea.getDomainEvents) {
                        const events = focusArea.getDomainEvents();
                        allDomainEvents.push(...events);
                        
                        // Clear events
                        if (focusArea.clearDomainEvents) {
                            focusArea.clearDomainEvents();
                        }
                    }
                }
                catch (error) {
                    errorCollector.collect(error, `save_focus_area_${focusArea.id}`);
                    this._log('error', 'Error saving focus area in batch', {
                        userId,
                        focusAreaId: focusArea.id,
                        error: error.message
                    });
                }
            }
            
            // If all failed, throw an error
            if (savedAreas.length === 0 && errorCollector.hasErrors()) {
                const errors = errorCollector.getErrors();
                throw new DatabaseError(`Failed to save any focus areas in batch: ${errors[0].error.message}`, {
                    entityType: this.domainName,
                    operation: 'saveBatch',
                    metadata: { userId, errorCount: errors.length }
                });
            }
            
            // Publish collected domain events
            for (const event of allDomainEvents) {
                try {
                    await this.eventBus.publish(event.type, event.payload);
                }
                catch (eventError) {
                    errorCollector.collect(eventError, 'event_publishing');
                    this._log('error', 'Error publishing domain event', {
                        eventType: event.type,
                        error: eventError.message
                    });
                }
            }
            
            this._log('info', 'Successfully saved batch of focus areas', {
                userId,
                count: savedAreas.length,
                eventsPublished: allDomainEvents.length
            });
            
            return savedAreas;
        });
    }

    /**
     * Delete a focus area by ID
     * @param {string} id - Focus area ID
     * @returns {Promise<boolean>} True if successfully deleted
     * @throws {FocusAreaNotFoundError} If focus area not found
     * @throws {FocusAreaValidationError} If ID is invalid
     * @throws {FocusAreaPersistenceError} If database operation fails
     */
    async deleteById(id) {
        // Validate ID
        this._validateId(id);
        
        // First check if focus area exists (this will throw if not found)
        const focusArea = await this.findById(id, true);
        
        return this._withRetry(async () => {
            this._log('debug', 'Deleting focus area', { id });
            
            const { error } = await this.db
                .from(this.tableName)
                .delete()
                .eq('id', id);
                
            if (error) {
                throw new DatabaseError(`Failed to delete focus area: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            // Publish deletion event
            try {
                const event = {
                    type: EventTypes.FOCUS_AREA_DELETED,
                    payload: {
                        focusAreaId: id,
                        userId: focusArea.userId,
                        name: focusArea.name
                    }
                };
                
                await this.eventBus.publish(event.type, event.payload);
                this._log('debug', 'Published focus area deleted event', { id });
            }
            catch (eventError) {
                // Log but don't fail the operation
                this._log('error', 'Error publishing focus area deleted event', {
                    id,
                    error: eventError.message
                });
            }
            
            return true;
        }, 'deleteById', { id });
    }

    /**
     * Helper method to convert camelCase field name to snake_case
     * @param {string} field - Field name in camelCase
     * @returns {string} Field name in snake_case
     * @private
     */
    _camelToSnakeField(field) {
        return field.replace(/([A-Z])/g, '_$1').toLowerCase();
    }
}

// Use lazy initialization for the singleton
let _instance = null;
function getRepositoryInstance() {
    if (!_instance) {
        _instance = new FocusAreaRepository();
    }
    return _instance;
}

// Export the singleton getter and the class
export const focusAreaRepository = getRepositoryInstance();
export default FocusAreaRepository;
