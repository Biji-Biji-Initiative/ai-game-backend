'use strict';

import User from "#app/core/user/models/User.js";
import UserMapper from "#app/core/user/mappers/UserMapper.js";
import { userDatabaseSchema } from "#app/core/user/schemas/userSchema.js";
import { UserNotFoundError, UserValidationError, UserError } from "#app/core/user/errors/UserErrors.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import { withRepositoryErrorHandling, createErrorMapper, createErrorCollector } from "#app/core/infra/errors/errorStandardization.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { v4 as uuidv4 } from 'uuid';

// Create an error mapper for the user domain
const userErrorMapper = createErrorMapper({
    EntityNotFoundError: UserNotFoundError,
    ValidationError: UserValidationError,
    DatabaseError: UserError,
}, UserError);
/**
 * Repository for user data access with standardized error handling
 * @extends BaseRepository
 */
class UserRepository extends BaseRepository {
    /**
     * Create a new UserRepository
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus instance
     */
    constructor(options = {}) {
        super({
            db: options.db,
            tableName: 'users',
            domainName: 'user',
            logger: options.logger,
            maxRetries: 3,
        });
        
        // Revert validation changes
        if (!options.db) {
            // Throw if critical dependency is missing during construction
            // Log if db is missing
            this.logger?.warn('No database client provided to UserRepository');
        }
        
        this.db = options.db;
        this.eventBus = options.eventBus;
        this.validateUuids = true;
        
        // Log warnings for optional dependencies
        if (!this.eventBus) {
            this.logger?.warn('No eventBus provided to UserRepository. Domain events will not be published.');
        }
        
        // Apply standardized error handling to methods
        // Bind methods ensures 'this' context is correct when wrapped
        this.findById = withRepositoryErrorHandling(this.findById.bind(this), {
            methodName: 'findById',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.findByEmail = withRepositoryErrorHandling(this.findByEmail.bind(this), {
            methodName: 'findByEmail',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.save = withRepositoryErrorHandling(this.save.bind(this), {
            methodName: 'save',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.delete = withRepositoryErrorHandling(this.delete.bind(this), {
            methodName: 'delete',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.findAll = withRepositoryErrorHandling(this.findAll.bind(this), {
            methodName: 'findAll',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        
        // Add error handling for our new createMinimalUser method
        this.createMinimalUser = withRepositoryErrorHandling(this.createMinimalUser.bind(this), {
            methodName: 'createMinimalUser',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        
        // Note: findByIds is not wrapped here, assumes BaseRepository handles its errors or it's called internally.
    }
    /**
     * Find a user by ID
     * @param {string} id - User ID to search for
     * @param {boolean} throwIfNotFound - Whether to throw an error if user not found
     * @returns {Promise<User|null>} User object or null if not found
     * @throws {UserNotFoundError} If user not found and throwIfNotFound is true
     * @throws {UserError} If database operation fails
     */
    findById(id, throwIfNotFound = false) {
        // Validate ID
        this._validateId(id);
        return this._withRetry(async () => {
            this._log('debug', 'Finding user by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch user: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id },
                });
            }
            if (!data) {
                this._log('debug', 'User not found', { id });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`User with ID ${id} not found`, {
                        entityId: id,
                        entityType: this.domainName,
                    });
                }
                return null;
            }
            // Validate the database data
            const validationResult = userDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    id,
                    errors: validationResult.error.errors,
                });
            }
            // Convert database model to domain model using the mapper
            const user = UserMapper.toDomain(data, { eventBus: this.eventBus, EventTypes: EventTypes });
            return user;
        }, 'findById', { id });
    }
    /**
     * Find multiple users by their IDs
     * 
     * Efficiently retrieves multiple users in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of user IDs
     * @returns {Promise<Array<User>>} Array of user objects
     * @throws {UserError} If database operation fails
     */
    async findByIds(ids) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            const users = [];
            for (const record of records) {
                // Validate the database data
                const validationResult = userDatabaseSchema.safeParse(record);
                if (!validationResult.success) {
                    this._log('warn', 'Database data validation warning', {
                        id: record.id,
                        errors: validationResult.error.errors,
                    });
                    continue;
                }
                
                // Convert database model to domain model using the mapper
                const user = UserMapper.toDomain(record, { eventBus: this.eventBus, EventTypes: EventTypes });
                if (user) {
                    users.push(user);
                }
            }
            
            return users;
        } catch (error) {
            this._log('error', 'Error finding users by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new UserError(`Failed to fetch users by IDs: ${error.message}`, {
                cause: error,
                metadata: { count: ids?.length || 0 }
            });
        }
    }
    /**
     * Find a user by email
     * @param {string} email - User email address to search for
     * @param {boolean} throwIfNotFound - Whether to throw an error if user not found
     * @returns {Promise<User|null>} User object or null if not found
     * @throws {UserNotFoundError} If user not found and throwIfNotFound is true
     * @throws {UserError} If database operation fails
     */
    findByEmail(email, throwIfNotFound = false) {
        // Validate email
        this._validateRequiredParams({ email }, ['email']);
        return this._withRetry(async () => {
            this._log('debug', 'Finding user by email', { email });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch user by email: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByEmail',
                    metadata: { email },
                });
            }
            if (!data) {
                this._log('debug', 'User not found by email', { email });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`User with email ${email} not found`, {
                        entityId: email,
                        entityType: this.domainName,
                        identifierType: 'email',
                    });
                }
                return null;
            }
            // Validate the database data
            const validationResult = userDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    email,
                    errors: validationResult.error.errors,
                });
            }
            // Convert database model to domain model using the mapper
            const user = UserMapper.toDomain(data, { eventBus: this.eventBus, EventTypes: EventTypes });
            return user;
        }, 'findByEmail', { email });
    }
    /**
     * Save a user to the database (create or update)
     * @param {User} user - User domain entity to save
     * @returns {Promise<User>} Saved user
     * @throws {ValidationError} If user is invalid
     * @throws {DatabaseError} If database operation fails
     */
    save(user) {
        if (!(user instanceof User)) {
            throw new ValidationError('Invalid user object provided to save method');
        }
        
        const isUpdate = user.id && this.exists(user.id);
        this._log('debug', `${isUpdate ? 'Updating' : 'Creating'} user`, { userId: user.id });
        
        // Ensure User instance has EventTypes, pass if necessary
        // This assumes the User instance passed in might not have been created
        // by this repository (e.g., created in a service layer).
        if (!user.EventTypes) {
             user.EventTypes = EventTypes; // Assign static EventTypes if missing
        }
        
        // Get events *before* transaction
        const domainEventsToPublish = user.getDomainEvents();
        
        return this.withTransaction(async (transaction) => {
            let result;
            
            // Convert domain model to database format using mapper
            const dbData = UserMapper.toPersistence(user);
            
            // Validate persistence data (optional, but good practice)
            const dbValidation = userDatabaseSchema.safeParse(dbData);
            if (!dbValidation.success) {
                throw new ValidationError(`Invalid data format for persistence: ${dbValidation.error.message}`, {
                    validationErrors: dbValidation.error.flatten(),
                });
            }

            if (isUpdate) {
                // Update existing user
                this._log('debug', 'Updating user', { userId: user.id });
                
                const { data, error } = await transaction
                    .from(this.tableName)
                    .update(dbValidation.data) // Use validated data
                    .eq('id', user.id)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to update user: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save',
                        metadata: { id: user.id },
                    });
                }
                
                result = data;
            } else {
                // Create new user
                this._log('debug', 'Creating new user');
                
                const { data, error } = await transaction
                    .from(this.tableName)
                    .insert(dbValidation.data) // Use validated data
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to create user: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save',
                    });
                }
                
                result = data;
            }
            
            // Convert database result back to domain model using the mapper
            const savedUser = UserMapper.toDomain(result, { eventBus: this.eventBus, EventTypes: EventTypes });
            
            // Clear events from the *original* entity passed in
            user.clearDomainEvents();
            
            // Return result and the events collected *before* the transaction
            return {
                result: savedUser,
                domainEvents: domainEventsToPublish
            };
        }, {
            publishEvents: true, // BaseRepository handles publishing events from the return value
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Delete a user by ID
     * @param {string} id - ID of the user to delete
     * @returns {Promise<Object>} Result of the deletion operation
     * @throws {UserNotFoundError} If user not found
     * @throws {UserError} If database operation fails
     */
    delete(id) {
        // Validate ID
        this._validateId(id);
        
        this._log('debug', 'Deleting user', { userId: id });
        
        return this.withTransaction(async (transaction) => {
            // First find the user to ensure it exists and get data for event
            const { data: userRecord, error: findError } = await transaction
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (findError) {
                throw new DatabaseError(`Failed to find user for deletion: ${findError.message}`, {
                    cause: findError,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            if (!userRecord) {
                throw new EntityNotFoundError(`User with ID ${id} not found`, {
                    entityId: id,
                    entityType: this.domainName
                });
            }
            
            // Convert to domain entity to create/collect events
            const user = UserMapper.toDomain(userRecord, { EventTypes: EventTypes });
            
            // Add domain event for deletion using the static EventTypes
            user.addDomainEvent(EventTypes.USER_DELETED, {
                userId: id,
                email: user.email, // Include email if available
                action: 'deleted'
            });
            
            // Collect domain events from the entity
            const domainEventsToPublish = user.getDomainEvents();
            
            // Delete from the database
            const { data: result, error: deleteError } = await transaction
                .from(this.tableName)
                .delete()
                .eq('id', id)
                .select('id')
                .maybeSingle();
            
            if (deleteError) {
                throw new DatabaseError(`Failed to delete user: ${deleteError.message}`, {
                    cause: deleteError,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: { id }
                });
            }
            
            if (!result) {
                // This case might indicate the record was deleted between find and delete
                this._log('warn', 'User record disappeared before delete completed', { id });
                throw new UserError(`Failed to confirm deletion for user with ID ${id}`);
            }
            
            // Clear events from entity
            user.clearDomainEvents();
            
            return {
                result: { deleted: true, id: result.id },
                domainEvents: domainEventsToPublish
            };
        }, {
            publishEvents: true, // BaseRepository handles publishing
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Find all users matching criteria
     * @param {Object} _criteria - Search criteria
     * @param {Object} _options - Query options like pagination, sorting
     * @throws {UserError} If database operation fails
     */
    findAll(_criteria = {}, _options = {}) {
        // FindAll method with standardized error handling is applied in constructor
        // Implementation needs to use the mapper
        // Example structure:
        return this._withRetry(async () => {
            // ... build query based on criteria/options ...
            // Example: Fetching all for simplicity, add actual filtering/pagination
            const { data, error, count } = await this.db
                .from(this.tableName)
                .select('* ', { count: 'exact' }); // Corrected syntax
            if (error) {
                throw new DatabaseError('Failed to fetch users', { cause: error, operation: 'findAll' });
            }
            const users = UserMapper.toDomainCollection(data || [], { eventBus: this.eventBus, EventTypes: EventTypes });
            return { users, total: count || 0 }; // Ensure total is a number
        }, 'findAll', { _criteria, _options });
    }

    /**
     * Check if a user exists by ID.
     * @param {string} id User ID.
     * @returns {Promise<boolean>} True if user exists, false otherwise.
     * @private // Or make public if needed elsewhere
     */
    async exists(id) {
        if (!id) return false;
        try {
            const { count, error } = await this.db
                .from(this.tableName)
                .select('id', { count: 'exact', head: true })
                .eq('id', id);
                
            if (error) {
                this._log('error', 'Error checking user existence', { id, error: error.message });
                return false; // Fail safe
            }
            return count > 0;
        } catch (err) {
            this._log('error', 'Exception checking user existence', { id, error: err.message });
            return false;
        }
    }

    /**
     * Create a minimal user record directly, bypassing the domain model validation
     * Intended only for the user interest registration flow
     * 
     * @param {Object} userData - Basic user data (email, name)
     * @returns {Promise<Object>} - Created user database record
     */
    async createMinimalUser(userData) {
        if (!userData.email || !userData.name) {
            throw new ValidationError('Email and name are required for minimal user creation');
        }
        
        try {
            const now = new Date().toISOString();
            const userId = uuidv4();
            
            // Ensure this matches the actual DB schema from migrations (id, email, name, created_at, updated_at)
            const minimalUserData = {
                id: userId,
                email: userData.email,
                name: userData.name, 
                created_at: now,    
                updated_at: now
            };
            
            this._log('debug', 'Attempting to insert minimal user record', { 
                email: userData.email
            });
            
            // Insert using the service_role key which bypasses RLS
            // This avoids the need to use Supabase Auth directly 
            const { data, error } = await this.db
                .from(this.tableName)
                .insert(minimalUserData)
                .select()
                .single();
                
            if (error) {
                // Log the raw database error *before* wrapping it
                this._log('error', 'RAW DATABASE ERROR during createMinimalUser', {
                    errorMessage: error.message,
                    errorCode: error.code,
                    errorDetails: error.details,
                    errorHint: error.hint
                });
                
                throw new DatabaseError(`Failed to create minimal user: ${error.message}`, {
                    cause: error, // Pass the original error
                    entityType: this.domainName,
                    operation: 'createMinimalUser',
                    details: error.details || {},
                    code: error.code || 'UNKNOWN'
                });
            }
            
            this._log('info', 'Successfully inserted minimal user record', { userId: data.id, email: data.email });
            return data;

        } catch (error) {
             // Catch errors thrown within the try block (like ValidationError or re-thrown DatabaseError)
            this._log('error', 'Caught error in createMinimalUser catch block', {
                email: userData?.email,
                errorName: error.name,
                errorMessage: error.message,
                // Log additional properties if they exist
                ...(error.cause && { cause: error.cause.message }),
                ...(error.code && { code: error.code }),
                ...(error.details && { details: error.details }),
                // Avoid logging full stack in production, but useful for debug
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
            });
            
            // Re-throw the error to be handled by the standardized error handler 
            // (applied via withRepositoryErrorHandling in the constructor)
            // If it's already a DatabaseError or ValidationError, throw it as is.
            // Otherwise, wrap it in a generic UserError.
            if (error instanceof DatabaseError || error instanceof ValidationError) {
                throw error;
            } else {
                // Wrap unexpected errors
                throw new UserError(`Unexpected error during minimal user creation: ${error.message}`, {
                    cause: error,
                    metadata: { email: userData?.email }
                });
            }
        }
    }
}

export { UserRepository };
export default UserRepository;
